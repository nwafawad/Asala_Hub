import uuid
from datetime import datetime, timezone
from typing import List
from sqlmodel import Session, select

from app.models.transaction import TransactionLog
from app.models.assignment import Submission, SyncStatus
from app.schemas.sync import SyncBatchRequest, SyncBatchResponse, SyncTransactionResult

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

def process_sync_batch(
    session: Session,
    user_id: uuid.UUID,
    batch: SyncBatchRequest
) -> SyncBatchResponse:
    results: List[SyncTransactionResult] = []
    synced_count = 0
    error_count = 0

    for tx in batch.transactions:
        # Idempotency check: verify if transaction log was already recorded
        existing_log = session.exec(
            select(TransactionLog).where(TransactionLog.id == tx.transaction_id)
        ).first()

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

        now = get_utc_now()

        try:
            with session.begin_nested():
                if tx.entity_type == "submission":
                    assignment_id_str = tx.payload.get("assignment_id")
                    content = tx.payload.get("content", "")
                    
                    if not assignment_id_str:
                        raise ValueError("Missing assignment_id in submission payload")

                    assignment_id = uuid.UUID(str(assignment_id_str))

                    # Check if submission already exists for entity_id
                    existing_submission = session.exec(
                        select(Submission).where(Submission.id == tx.entity_id)
                    ).first()

                    if existing_submission:
                        # Last-Write-Wins (LWW) conflict resolution policy:
                        # Only overwrite existing submission if client_timestamp is newer or equal
                        client_time = tx.client_timestamp.replace(tzinfo=None) if tx.client_timestamp else now
                        if client_time >= existing_submission.updated_at:
                            existing_submission.content = content
                            existing_submission.sync_status = SyncStatus.synced
                            existing_submission.updated_at = now
                            session.add(existing_submission)
                    else:
                        new_submission = Submission(
                            id=tx.entity_id,
                            assignment_id=assignment_id,
                            student_id=user_id,
                            content=content,
                            submitted_at=tx.client_timestamp.replace(tzinfo=None) if tx.client_timestamp else now,
                            sync_status=SyncStatus.synced,
                            created_at=now,
                            updated_at=now
                        )
                        session.add(new_submission)

                # Record transaction log entry
                log_entry = TransactionLog(
                    id=tx.transaction_id,
                    user_id=user_id,
                    entity_type=tx.entity_type,
                    entity_id=tx.entity_id,
                    payload=tx.payload,
                    client_timestamp=tx.client_timestamp.replace(tzinfo=None) if tx.client_timestamp else now,
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
