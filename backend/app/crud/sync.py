from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional
from sqlmodel import Session, select

from app.models.user import get_naive_utc_now
from app.models.transaction import TransactionLog
from app.models.assignment import Submission, SyncStatus
from app.schemas.sync import (
    SyncBatchRequest,
    SyncBatchResponse,
    SyncTransactionResult,
    SubmissionPayloadSchema,
    CURRENT_SCHEMA_VERSION,
    MIN_SUPPORTED_SCHEMA_VERSION,
)

def _to_naive_utc(dt: Optional[datetime], fallback: datetime) -> datetime:
    """Convert an optional datetime to a naive UTC datetime, falling back to a default value."""
    if dt is None:
        return fallback
    return dt.replace(tzinfo=None)

def normalize_payload(payload: dict, schema_version: int, entity_type: str) -> dict:
    """
    Normalize older payload shapes into the current internal schema shape.
    Allows backward-compatible handling of older client payload versions (FR-20).
    """
    normalized = dict(payload)
    if schema_version <= 1:
        if entity_type == "submission":
            # Map legacy field names if present in older payloads
            if "body" in normalized and "content" not in normalized:
                normalized["content"] = normalized.pop("body")
            if "ver" in normalized and "version" not in normalized:
                normalized["version"] = normalized.pop("ver")
    return normalized

def process_sync_batch(
    session: Session,
    user_id: uuid.UUID,
    batch: SyncBatchRequest
) -> SyncBatchResponse:
    """
    Process a batch of offline mutation transactions idempotently.
    Applies schema versioning (FR-20), submission updates, version conflict detection, and transaction logging.
    """
    results: List[SyncTransactionResult] = []
    synced_count = 0
    error_count = 0

    if not batch.transactions:
        return SyncBatchResponse(results=[], synced_count=0, error_count=0)

    # Bulk pre-fetch existing transaction IDs to avoid N+1 queries
    all_tx_ids = [tx.transaction_id for tx in batch.transactions]
    existing_tx_logs = {
        tx_log.id: tx_log
        for tx_log in session.exec(
            select(TransactionLog).where(TransactionLog.id.in_(all_tx_ids))
        ).all()
    }

    # Bulk pre-fetch existing submissions for entity_ids
    submission_entity_ids = [
        tx.entity_id for tx in batch.transactions if tx.entity_type == "submission"
    ]
    existing_submissions: dict[uuid.UUID, Submission] = {}
    if submission_entity_ids:
        existing_submissions = {
            sub.id: sub
            for sub in session.exec(
                select(Submission).where(Submission.id.in_(submission_entity_ids))
            ).all()
        }

    now = get_naive_utc_now()

    for tx in batch.transactions:
        # Rejection path: check schema_version compatibility (FR-20)
        if tx.schema_version < MIN_SUPPORTED_SCHEMA_VERSION or tx.schema_version > CURRENT_SCHEMA_VERSION:
            results.append(
                SyncTransactionResult(
                    transaction_id=tx.transaction_id,
                    status="unsupported_schema_version",
                    synced_at=None,
                    error=f"Unsupported schema_version {tx.schema_version}. Supported range is {MIN_SUPPORTED_SCHEMA_VERSION} to {CURRENT_SCHEMA_VERSION}."
                )
            )
            error_count += 1
            continue

        # Idempotency check: verify if transaction log was already recorded
        existing_log = existing_tx_logs.get(tx.transaction_id)
        if existing_log:
            results.append(
                SyncTransactionResult(
                    transaction_id=tx.transaction_id,
                    status="accepted",
                    synced_at=existing_log.synced_at or existing_log.created_at,
                    error=None
                )
            )
            synced_count += 1
            continue

        try:
            client_time = _to_naive_utc(tx.client_timestamp, now)
            normalized_payload = normalize_payload(tx.payload, tx.schema_version, tx.entity_type)

            with session.begin_nested():
                if tx.entity_type == "submission":
                    payload_data = SubmissionPayloadSchema.model_validate(normalized_payload)
                    assignment_id = payload_data.assignment_id
                    content = payload_data.content

                    # Check pre-fetched existing submission
                    existing_submission = existing_submissions.get(tx.entity_id)

                    if tx.action.upper() == "DELETE":
                        if existing_submission:
                            existing_submission.is_deleted = True
                            existing_submission.sync_status = SyncStatus.synced
                            existing_submission.updated_at = now
                            session.add(existing_submission)
                    elif existing_submission:
                        # Version-based conflict detection with Last-Write-Wins fallback
                        client_version = payload_data.version or 1
                        if isinstance(client_version, int) and client_version < existing_submission.version:
                            # Flag conflict if client version is behind server version
                            existing_submission.sync_status = SyncStatus.conflict
                            session.add(existing_submission)
                            results.append(
                                SyncTransactionResult(
                                    transaction_id=tx.transaction_id,
                                    status="rejected",
                                    synced_at=None,
                                    error=f"Version conflict: server has v{existing_submission.version}, client sent v{client_version}"
                                )
                            )
                            error_count += 1
                            continue

                        if client_time >= existing_submission.updated_at:
                            existing_submission.content = content
                            existing_submission.sync_status = SyncStatus.synced
                            existing_submission.version += 1
                            existing_submission.updated_at = now
                            session.add(existing_submission)
                    else:
                        new_submission = Submission(
                            id=tx.entity_id,
                            assignment_id=assignment_id,
                            student_id=user_id,
                            content=content,
                            submitted_at=client_time,
                            sync_status=SyncStatus.synced,
                            version=payload_data.version or 1,
                            created_at=now,
                            updated_at=now
                        )
                        session.add(new_submission)
                        existing_submissions[tx.entity_id] = new_submission

                # Record transaction log entry with schema_version
                log_entry = TransactionLog(
                    id=tx.transaction_id,
                    user_id=user_id,
                    entity_type=tx.entity_type,
                    entity_id=tx.entity_id,
                    payload=normalized_payload,
                    schema_version=tx.schema_version,
                    client_timestamp=client_time,
                    synced_at=now,
                    created_at=now,
                    updated_at=now
                )
                session.add(log_entry)
                session.flush()

            results.append(
                SyncTransactionResult(
                    transaction_id=tx.transaction_id,
                    status="accepted",
                    synced_at=now,
                    error=None
                )
            )
            synced_count += 1

        except Exception as e:
            error_count += 1
            results.append(
                SyncTransactionResult(
                    transaction_id=tx.transaction_id,
                    status="rejected",
                    synced_at=None,
                    error=str(e)
                )
            )

    # Commit all accepted savepoints in a single atomic database commit
    if synced_count > 0:
        session.commit()

    return SyncBatchResponse(
        results=results,
        synced_count=synced_count,
        error_count=error_count
    )



