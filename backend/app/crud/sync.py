"""
Sync Database CRUD Operations.

Provides pure data access operations for TransactionLog and Submission entities
used during offline synchronization workflows.
"""

from __future__ import annotations

import uuid
from typing import List, Dict
from sqlmodel import Session, select, func, col

from app.models.transaction import TransactionLog
from app.models.assignment import Submission


def get_transaction_logs_by_ids(
    session: Session, transaction_ids: List[uuid.UUID]
) -> Dict[uuid.UUID, TransactionLog]:
    """
    Bulk pre-fetch TransactionLog entries matching a list of transaction UUIDs.
    
    Args:
        session (Session): The active database transaction session.
        transaction_ids (List[UUID]): List of transaction IDs to look up.
    Returns:
        Dict[UUID, TransactionLog]: Map of transaction ID to TransactionLog instance.
    """
    if not transaction_ids:
        return {}
    
    logs = session.exec(
        select(TransactionLog).where(col(TransactionLog.id).in_(transaction_ids))
    ).all()
    return {log.id: log for log in logs}


def get_submissions_by_ids(
    session: Session, submission_ids: List[uuid.UUID]
) -> Dict[uuid.UUID, Submission]:
    """
    Bulk pre-fetch Submission entities matching a list of submission UUIDs.
    
    Args:
        session (Session): The active database transaction session.
        submission_ids (List[UUID]): List of submission IDs to look up.
    Returns:
        Dict[UUID, Submission]: Map of submission ID to Submission instance.
    """
    if not submission_ids:
        return {}

    submissions = session.exec(
        select(Submission).where(col(Submission.id).in_(submission_ids))
    ).all()
    return {sub.id: sub for sub in submissions}


def get_latest_server_sequence(session: Session) -> int:
    """
    Fetch the maximum global server sequence number recorded in TransactionLog.
    
    Args:
        session (Session): The active database transaction session.
    Returns:
        int: Maximum server_sequence, or 0 if no transactions exist.
    """
    max_seq = session.exec(select(func.max(col(TransactionLog.server_sequence)))).first()
    return max_seq or 0


def get_sync_delta(
    session: Session,
    since_sequence: int = 0,
    limit: int = 500
) -> List[TransactionLog]:
    """
    Retrieve transaction logs recorded after `since_sequence` for client pull sync.
    
    Args:
        session (Session): The active database transaction session.
        since_sequence (int): The last server_sequence acknowledged by the client.
        limit (int): Maximum records to fetch.
    Returns:
        List[TransactionLog]: List of newer TransactionLog instances ordered by sequence.
    """
    return list(session.exec(
        select(TransactionLog)
        .where(col(TransactionLog.server_sequence) > since_sequence)
        .order_by(col(TransactionLog.server_sequence).asc())
        .limit(limit)
    ).all())
