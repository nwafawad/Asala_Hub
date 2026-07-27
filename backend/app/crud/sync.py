from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional
from sqlmodel import Session, select, func, text, col

from app.models.user import User, UserRole, get_naive_utc_now
from app.models.transaction import TransactionLog
from app.models.assignment import Submission, SyncStatus
from pydantic import ValidationError

from app.schemas.sync import (
    SyncBatchRequest,
    SyncBatchResponse,
    SyncTransactionResult,
    SubmissionContentPayload,
    GradePayload,
    CURRENT_SCHEMA_VERSION,
    MIN_SUPPORTED_SCHEMA_VERSION,
)

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
            max_seq = session.exec(select(func.max(col(TransactionLog.server_sequence)))).first()
            self._current_seq = max_seq or 0

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
    # Fast path: no dict copying needed if payload is already current schema version
    if schema_version >= CURRENT_SCHEMA_VERSION:
        return payload

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
    Enforces BR-4 grade-write priority rules, server-authoritative sequence ordering (FR-15),
    and schema versioning (FR-20).
    """
    results: List[SyncTransactionResult] = []
    synced_count = 0
    error_count = 0

    if not batch.transactions:
        return SyncBatchResponse(results=[], synced_count=0, error_count=0)

    # Initialize batch sequence generator
    seq_gen = ServerSequenceGenerator(session)

    # Fetch acting user instance to verify role permissions (e.g. educator vs student)
    acting_user = session.get(User, user_id)

    # Bulk pre-fetch existing transaction IDs to avoid N+1 queries
    all_tx_ids = [tx.transaction_id for tx in batch.transactions]
    existing_tx_logs = {
        tx_log.id: tx_log
        for tx_log in session.exec(
            select(TransactionLog).where(col(TransactionLog.id).in_(all_tx_ids))
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
                select(Submission).where(col(Submission.id).in_(submission_entity_ids))
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
                    server_sequence=None,
                    synced_at=None,
                    error=f"Unsupported schema_version {tx.schema_version}. Supported range is {MIN_SUPPORTED_SCHEMA_VERSION} to {CURRENT_SCHEMA_VERSION}."
                )
            )
            error_count += 1
            continue

        # Idempotency check: verify if transaction log was already recorded (supports intra-batch duplicates)
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
                # Server-authoritative sequence assignment (FR-15)
                server_seq = seq_gen.next()

                if tx.entity_type == "submission":
                    existing_submission = existing_submissions.get(tx.entity_id)
                    is_grade_write = "grade" in normalized_payload

                    if is_grade_write:
                        # BR-4 Priority Rule: Only educators are authorized to submit grade writes via sync
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

                        # BR-4 Priority Rule: Educator grade writes ALWAYS WIN regardless of client_version or LWW.
                        # Grade writes must NOT be routed through the same version-conflict rejection as content edits.
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
                        # Student content edit branch
                        payload_data = SubmissionContentPayload.model_validate(normalized_payload)

                        # BR-4 Priority Rule: A student content edit arriving AFTER a submission has already been graded
                        # must NOT clobber the grade or silently modify the graded submission state.
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

                        # Version-based conflict detection (primary authoritative signal)
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

                        # Server-authoritative sequence ordering (FR-15): Write is applied in server sequence arrival order
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
                            submitted_at=client_time,  # Client timestamp stored strictly for audit/display
                            sync_status=SyncStatus.synced,
                            version=payload_data.version or 1,
                            created_at=now,
                            updated_at=now
                        )
                        session.add(new_submission)
                        existing_submissions[tx.entity_id] = new_submission


                # Record transaction log entry with server_sequence and server_received_at
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

                # Update in-memory log cache to handle duplicate transactions within the same batch
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

    # Commit all accepted savepoints in a single atomic database commit
    if synced_count > 0:
        session.commit()

    return SyncBatchResponse(
        results=results,
        synced_count=synced_count,
        error_count=error_count
    )


SUPPORTED_ENTITY_TYPES = {"submission"}

def get_latest_server_sequence(session: Session) -> int:
    """
    Fetch the latest global server sequence checkpoint number.
    
    Args:
        session (Session): The active database transaction session.
    Returns:
        int: Current maximum server_sequence checkpoint.
    """
    max_seq = session.exec(select(func.max(col(TransactionLog.server_sequence)))).first()
    return max_seq or 0

def get_sync_delta(
    session: Session,
    since_sequence: int = 0,
    limit: int = 500
) -> List[TransactionLog]:
    """
    Retrieve server mutation transaction logs registered after since_sequence.
    Used by offline-first clients during pull synchronization.
    
    Args:
        session (Session): The active database transaction session.
        since_sequence (int): The last server_sequence checkpoint acknowledged by client.
        limit (int): Maximum transaction logs to return per pull request.
    Returns:
        List[TransactionLog]: List of newer transaction logs ordered by sequence.
    """
    return list(session.exec(
        select(TransactionLog)
        .where(col(TransactionLog.server_sequence) > since_sequence)
        .order_by(col(TransactionLog.server_sequence).asc())
        .limit(limit)
    ).all())



