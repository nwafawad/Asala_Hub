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
    existing_submissions = {}
    if submission_entity_ids:
        existing_submissions = {
            sub.id: sub
            for sub in session.exec(
                select(Submission).where(Submission.id.in_(submission_entity_ids))
            ).all()
        }

    now = get_utc_now()

    for tx in batch.transactions:
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
            with session.begin_nested():
                if tx.entity_type == "submission":
                    assignment_id_str = tx.payload.get("assignment_id")
                    content = tx.payload.get("content", "")
                    
                    if not assignment_id_str:
                        raise ValueError("Missing assignment_id in submission payload")

                    assignment_id = uuid.UUID(str(assignment_id_str))

                    # Check pre-fetched existing submission
                    existing_submission = existing_submissions.get(tx.entity_id)

                    if existing_submission:
                        # Version-based conflict detection with Last-Write-Wins fallback
                        client_version = tx.payload.get("version", 1)
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

                        client_time = tx.client_timestamp.replace(tzinfo=None) if tx.client_timestamp else now
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
                            submitted_at=tx.client_timestamp.replace(tzinfo=None) if tx.client_timestamp else now,
                            sync_status=SyncStatus.synced,
                            version=tx.payload.get("version", 1),
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

