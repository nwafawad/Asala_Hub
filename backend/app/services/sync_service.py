"""
Offline Sync Engine Service.

Handles transaction batch processing, payload normalization, sequence management,
and conflict resolution for offline-first client synchronization.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional, Dict
from pydantic import ValidationError
from sqlmodel import Session, select, func, text, col

from app.models.base import get_naive_utc_now
from app.models.user import User, UserRole
from app.models.transaction import TransactionLog
from app.models.assignment import Submission, SyncStatus
from app.schemas.sync import (
    SyncBatchRequest,
    SyncBatchResponse,
    SyncTransactionResult,
    SubmissionContentPayload,
    GradePayload,
    CURRENT_SCHEMA_VERSION,
    MIN_SUPPORTED_SCHEMA_VERSION,
)
import app.crud.sync as crud_sync


def _to_naive_utc(dt: Optional[datetime], fallback: datetime) -> datetime:
    """Convert an optional datetime to a naive UTC datetime, falling back to a default value."""
    if dt is None:
        return fallback
    return dt.replace(tzinfo=None)


class ServerSequenceGenerator:
    """
    Stateful sequence generator for batch processing.
    Uses Postgres nextval('tx_log_server_seq') in production and a cached max() sequence counter
    for non-Postgres (e.g. SQLite) to eliminate N+1 sequence queries inside loops.
    """
    def __init__(self, session: Session):
        self.session = session
        bind = session.get_bind()
        self.is_postgres = bool(bind and bind.dialect.name == "postgresql")
        if not self.is_postgres:
            max_seq = crud_sync.get_latest_server_sequence(session)
            self._current_seq = max_seq

    def next(self) -> int:
        if self.is_postgres:
            return self.session.scalar(text("SELECT nextval('tx_log_server_seq')"))
        self._current_seq += 1
        return self._current_seq


def normalize_payload(payload: dict, schema_version: int, entity_type: str) -> dict:
    """
    Normalize older payload shapes into the current internal schema shape.
    Allows backward-compatible handling of older client payload versions (FR-20).
    """
    if schema_version >= CURRENT_SCHEMA_VERSION:
        return payload

    normalized = dict(payload)
    if schema_version <= 1:
        if entity_type == "submission":
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
    Enforces BR-4 grade-write priority rules, server-authoritative sequence ordering (FR-15),
    and schema versioning (FR-20).
    """
    results: List[SyncTransactionResult] = []
    synced_count = 0
    error_count = 0

    if not batch.transactions:
        return SyncBatchResponse(results=[], synced_count=0, error_count=0)

    seq_gen = ServerSequenceGenerator(session)
    acting_user = session.get(User, user_id)

    # Bulk pre-fetch existing transaction logs to eliminate N+1 queries
    all_tx_ids = [tx.transaction_id for tx in batch.transactions]
    existing_tx_logs = crud_sync.get_transaction_logs_by_ids(session, all_tx_ids)

    # Bulk pre-fetch existing submissions for submission entity_ids
    submission_entity_ids = [
        tx.entity_id for tx in batch.transactions if tx.entity_type == "submission"
    ]
    existing_submissions: Dict[uuid.UUID, Submission] = {}
    if submission_entity_ids:
        existing_submissions = crud_sync.get_submissions_by_ids(session, submission_entity_ids)

    now = get_naive_utc_now()

    for tx in batch.transactions:
        # Schema version compatibility check (FR-20)
        if tx.schema_version < MIN_SUPPORTED_SCHEMA_VERSION or tx.schema_version > CURRENT_SCHEMA_VERSION:
            results.append(
                SyncTransactionResult(
                    transaction_id=tx.transaction_id,
                    status="unsupported_schema_version",
                    server_sequence=None,
                    synced_at=None,
                    error=f"Unsupported schema_version {tx.schema_version}. Supported range is {MIN_SUPPORTED_SCHEMA_VERSION} to {CURRENT_SCHEMA_VERSION}."
                )
            )
            error_count += 1
            continue

        # Idempotency check: verify if transaction log was already processed
        existing_log = existing_tx_logs.get(tx.transaction_id)
        if existing_log:
            results.append(
                SyncTransactionResult(
                    transaction_id=tx.transaction_id,
                    status="accepted",
                    server_sequence=existing_log.server_sequence,
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
                server_seq = seq_gen.next()

                if tx.entity_type == "submission":
                    existing_submission = existing_submissions.get(tx.entity_id)
                    is_grade_write = "grade" in normalized_payload

                    if is_grade_write:
                        # BR-4: Only educators can submit grade writes via sync
                        if not acting_user or acting_user.role != UserRole.educator:
                            results.append(
                                SyncTransactionResult(
                                    transaction_id=tx.transaction_id,
                                    status="rejected",
                                    server_sequence=server_seq,
                                    synced_at=None,
                                    error="Unauthorized: Only educators can submit grade mutations (BR-4 requirement)"
                                )
                            )
                            error_count += 1
                            continue

                        grade_data = GradePayload.model_validate(normalized_payload)

                        # BR-4 Priority Rule: Educator grade writes ALWAYS WIN
                        if existing_submission:
                            existing_submission.grade = grade_data.grade
                            existing_submission.sync_status = SyncStatus.synced
                            existing_submission.updated_at = now
                            session.add(existing_submission)
                            existing_submissions[tx.entity_id] = existing_submission
                    elif tx.action.upper() == "DELETE":
                        if existing_submission:
                            existing_submission.is_deleted = True
                            existing_submission.sync_status = SyncStatus.synced
                            existing_submission.updated_at = now
                            session.add(existing_submission)
                            existing_submissions[tx.entity_id] = existing_submission
                    elif existing_submission:
                        # Student content edit
                        payload_data = SubmissionContentPayload.model_validate(normalized_payload)

                        # BR-4: Edits to already graded submissions are rejected
                        if existing_submission.grade is not None:
                            existing_submission.sync_status = SyncStatus.conflict
                            session.add(existing_submission)
                            results.append(
                                SyncTransactionResult(
                                    transaction_id=tx.transaction_id,
                                    status="rejected",
                                    server_sequence=server_seq,
                                    synced_at=None,
                                    error="Cannot modify content of an already-graded submission (BR-4 violation)"
                                )
                            )
                            error_count += 1
                            continue

                        # Version conflict check
                        client_version = payload_data.version or 1
                        if isinstance(client_version, int) and client_version < existing_submission.version:
                            existing_submission.sync_status = SyncStatus.conflict
                            session.add(existing_submission)
                            results.append(
                                SyncTransactionResult(
                                    transaction_id=tx.transaction_id,
                                    status="rejected",
                                    server_sequence=server_seq,
                                    synced_at=None,
                                    error=f"Version conflict: server has v{existing_submission.version}, client sent v{client_version}"
                                )
                            )
                            error_count += 1
                            continue

                        # Update content and increment version
                        existing_submission.content = payload_data.content
                        existing_submission.sync_status = SyncStatus.synced
                        existing_submission.version = max(existing_submission.version + 1, client_version)
                        existing_submission.updated_at = now
                        session.add(existing_submission)
                        existing_submissions[tx.entity_id] = existing_submission
                    else:
                        payload_data = SubmissionContentPayload.model_validate(normalized_payload)
                        new_submission = Submission(
                            id=tx.entity_id,
                            assignment_id=payload_data.assignment_id,
                            student_id=user_id,
                            content=payload_data.content,
                            submitted_at=client_time,
                            sync_status=SyncStatus.synced,
                            version=payload_data.version or 1,
                            created_at=now,
                            updated_at=now
                        )
                        session.add(new_submission)
                        existing_submissions[tx.entity_id] = new_submission

                # Record transaction log entry
                log_entry = TransactionLog(
                    id=tx.transaction_id,
                    user_id=user_id,
                    entity_type=tx.entity_type,
                    entity_id=tx.entity_id,
                    payload=normalized_payload,
                    schema_version=tx.schema_version,
                    server_sequence=server_seq,
                    server_received_at=now,
                    client_timestamp=client_time,
                    synced_at=now,
                    created_at=now,
                    updated_at=now
                )
                session.add(log_entry)
                session.flush()

                existing_tx_logs[tx.transaction_id] = log_entry

            results.append(
                SyncTransactionResult(
                    transaction_id=tx.transaction_id,
                    status="accepted",
                    server_sequence=server_seq,
                    synced_at=now,
                    error=None
                )
            )
            synced_count += 1

        except ValidationError as ve:
            error_count += 1
            error_msg = ve.errors()[0]["msg"] if ve.errors() else str(ve)
            results.append(
                SyncTransactionResult(
                    transaction_id=tx.transaction_id,
                    status="rejected",
                    server_sequence=None,
                    synced_at=None,
                    error=f"Invalid payload format: {error_msg}"
                )
            )
        except Exception as e:
            error_count += 1
            results.append(
                SyncTransactionResult(
                    transaction_id=tx.transaction_id,
                    status="rejected",
                    server_sequence=None,
                    synced_at=None,
                    error=str(e)
                )
            )

    if synced_count > 0:
        session.commit()

    return SyncBatchResponse(
        results=results,
        synced_count=synced_count,
        error_count=error_count
    )
