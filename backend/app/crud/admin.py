from __future__ import annotations

import uuid
from typing import List, Dict
from sqlmodel import Session, select, func, or_, col
from sqlalchemy.orm import joinedload

from app.models import User, UserRole, Assignment, Submission, SyncStatus, TransactionLog
from app.models.base import get_naive_utc_now
from app.schemas.admin import (
    ConflictResolutionRequest,
    ConflictSubmissionRead,
    AdminHealthResponse,
)


def get_unresolved_conflicts(
    session: Session, skip: int = 0, limit: int = 100
) -> List[ConflictSubmissionRead]:
    """
    Retrieve paginated list of active submission conflicts awaiting resolution.
    Eagerly loads student and assignment details.
    """
    query = (
        select(Submission)
        .where(
            col(Submission.sync_status) == SyncStatus.conflict,
            col(Submission.is_deleted) == False,
            or_(
                col(Submission.resolution_status) != "resolved",
                col(Submission.resolution_status) == None,
            ),
        )
        .options(
            joinedload(getattr(Submission, "assignment")),
            joinedload(getattr(Submission, "student")),
        )
        .order_by(col(Submission.submitted_at).desc())
        .offset(skip)
        .limit(limit)
    )

    submissions = session.exec(query).all()
    results: List[ConflictSubmissionRead] = []

    for sub in submissions:
        item = ConflictSubmissionRead(
            id=sub.id,
            assignment_id=sub.assignment_id,
            student_id=sub.student_id,
            content=sub.content,
            submitted_at=sub.submitted_at,
            sync_status=sub.sync_status,
            grade=sub.grade,
            version=sub.version,
            resolution_status=sub.resolution_status,
            resolved_by=sub.resolved_by,
            resolved_at=sub.resolved_at,
            resolution_note=sub.resolution_note,
            assignment_title=sub.assignment.title if sub.assignment else None,
            student_name=sub.student.full_name if sub.student else None,
            student_email=sub.student.email if sub.student else None,
        )
        results.append(item)

    return results


def get_submission_for_resolution(session: Session, submission_id: uuid.UUID) -> Optional[Submission]:
    """
    Retrieve submission by ID with eager loading of assignment and student relationships.
    """
    return session.exec(
        select(Submission)
        .where(col(Submission.id) == submission_id, col(Submission.is_deleted) == False)
        .options(
            joinedload(getattr(Submission, "assignment")),
            joinedload(getattr(Submission, "student")),
        )
    ).first()


def resolve_submission_conflict(
    session: Session,
    submission: Submission,
    resolution_in: ConflictResolutionRequest,
    admin_user: User,
    commit: bool = True
) -> Submission:
    """
    Apply admin conflict resolution strategy to a submission in conflict state.
    """
    now = get_naive_utc_now()

    if resolution_in.strategy in ("accept_client", "manual_merge") and resolution_in.content is not None:
        submission.content = resolution_in.content

    if resolution_in.grade is not None:
        submission.grade = resolution_in.grade

    submission.sync_status = SyncStatus.synced
    submission.resolution_status = "resolved"
    submission.resolved_by = admin_user.id
    submission.resolved_at = now
    submission.resolution_note = resolution_in.resolution_note
    submission.version += 1
    submission.updated_at = now

    session.add(submission)
    if commit:
        session.commit()
        session.refresh(submission)
    return submission


def get_admin_health_metrics(session: Session) -> AdminHealthResponse:
    """
    Aggregate system metrics including DB status, transaction log counts,
    unresolved conflict counts, user counts by role, and sequence progress.
    Optimized to aggregate metrics in minimal database roundtrips.
    """
    # Test DB Connectivity
    db_status = "connected"
    try:
        session.exec(select(1))
    except Exception:
        db_status = "disconnected"

    # Single aggregate query for Transaction log metrics
    tx_stats = session.exec(
        select(
            func.count(col(TransactionLog.id)),
            func.max(col(TransactionLog.server_sequence))
        )
    ).first() or (0, 0)
    total_tx = tx_stats[0] or 0
    max_seq = tx_stats[1] or 0

    # Conflict metrics
    unresolved_conflicts = session.exec(
        select(func.count(col(Submission.id))).where(
            col(Submission.sync_status) == SyncStatus.conflict,
            col(Submission.is_deleted) == False,
            or_(
                col(Submission.resolution_status) != "resolved",
                col(Submission.resolution_status) == None,
            ),
        )
    ).first() or 0

    # Single aggregate query for User counts by role (GROUP BY)
    role_rows = session.exec(
        select(User.role, func.count(col(User.id))).group_by(User.role)
    ).all()
    
    users_count: Dict[str, int] = {"student": 0, "educator": 0, "admin": 0}
    for role_val, count_val in role_rows:
        role_key = role_val.value if hasattr(role_val, "value") else str(role_val)
        users_count[role_key] = count_val or 0

    return AdminHealthResponse(
        status="ok" if db_status == "connected" else "error",
        database=db_status,
        total_transaction_logs=total_tx,
        unresolved_conflicts=unresolved_conflicts,
        max_server_sequence=max_seq,
        users_count=users_count,
    )

