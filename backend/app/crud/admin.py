from __future__ import annotations

import json
import secrets
import uuid
from typing import List, Dict, Optional
from sqlmodel import Session, select, func, or_, col
from sqlalchemy.orm import joinedload

from app.models import User, UserRole, AccountStatus, Assignment, Submission, SyncStatus, TransactionLog, RefreshToken
from app.models.audit import AdminAuditEvent, AdminActionType
from app.models.course import Course
from app.models.base import get_naive_utc_now
from app.schemas.admin import (
    ConflictResolutionRequest,
    ConflictSubmissionRead,
    AdminHealthResponse,
    AdminUserRead,
    AdminUserDetail,
    CourseBasicInfo,
    SubmissionBasicInfo,
    AuditEventRead,
    AdminDashboardStats,
)
from app.core.security import get_password_hash


def create_audit_event(
    session: Session,
    actor_id: uuid.UUID,
    action_type: AdminActionType,
    target_user_id: Optional[uuid.UUID] = None,
    metadata_dict: Optional[dict] = None,
    commit: bool = True,
) -> AdminAuditEvent:
    """
    Log an administrative audit event for compliance tracking.
    """
    event = AdminAuditEvent(
        actor_id=actor_id,
        action_type=action_type,
        target_user_id=target_user_id,
        metadata_json=json.dumps(metadata_dict) if metadata_dict else None,
    )
    session.add(event)
    if commit:
        session.commit()
        session.refresh(event)
    return event


def get_unresolved_conflicts(
    session: Session, skip: int = 0, limit: int = 100
) -> List[ConflictSubmissionRead]:
    """
    Retrieve paginated list of active submission conflicts awaiting resolution.
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
    db_status = "connected"
    try:
        session.exec(select(1))
    except Exception:
        db_status = "disconnected"

    tx_stats = session.exec(
        select(
            func.count(col(TransactionLog.id)),
            func.max(col(TransactionLog.server_sequence))
        )
    ).first() or (0, 0)
    total_tx = tx_stats[0] or 0
    max_seq = tx_stats[1] or 0

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


# --- User Management CRUD ---

def get_users_for_admin(
    session: Session,
    skip: int = 0,
    limit: int = 100,
    role: Optional[UserRole] = None,
    status_filter: Optional[AccountStatus] = None,
    search: Optional[str] = None,
) -> List[AdminUserRead]:
    """
    Retrieve user directory rows for admin view with search, filtering, and aggregate counts.
    """
    query = select(User).order_by(col(User.created_at).desc())

    if role is not None:
        query = query.where(col(User.role) == role)
    if status_filter is not None:
        query = query.where(col(User.status) == status_filter)
    if search and search.strip():
        clean_search = search.strip().replace("%", r"\%").replace("_", r"\_")
        pattern = f"%{clean_search}%"
        query = query.where(
            or_(
                col(User.full_name).ilike(pattern),
                col(User.email).ilike(pattern)
            )
        )

    users = session.exec(query.offset(skip).limit(limit)).all()
    results: List[AdminUserRead] = []

    for u in users:
        # Count courses
        if u.role == UserRole.educator:
            c_count = session.exec(select(func.count(col(Course.id))).where(col(Course.educator_id) == u.id, col(Course.is_deleted) == False)).first() or 0
        else:
            c_count = session.exec(select(func.count(col(Course.id))).where(col(Course.is_deleted) == False)).first() or 0

        # Count submissions
        s_count = session.exec(select(func.count(col(Submission.id))).where(col(Submission.student_id) == u.id, col(Submission.is_deleted) == False)).first() or 0

        user_status = getattr(u, 'status', AccountStatus.active)
        must_change = getattr(u, 'must_change_password', False)

        results.append(
            AdminUserRead(
                id=u.id,
                full_name=u.full_name,
                email=u.email,
                role=u.role,
                status=user_status,
                must_change_password=must_change,
                preferred_language=u.preferred_language,
                created_at=u.created_at,
                updated_at=u.updated_at,
                course_count=c_count,
                submission_count=s_count,
                pending_sync_count=0,
            )
        )

    return results


def get_user_detail_for_admin(session: Session, user_id: uuid.UUID) -> Optional[AdminUserDetail]:
    """
    Retrieve full user detail package for the account detail drawer.
    """
    u = session.get(User, user_id)
    if not u:
        return None

    # Fetch courses
    if u.role == UserRole.educator:
        courses_db = session.exec(select(Course).where(col(Course.educator_id) == u.id, col(Course.is_deleted) == False)).all()
    else:
        courses_db = session.exec(select(Course).where(col(Course.is_deleted) == False).limit(5)).all()

    course_list = [CourseBasicInfo(id=c.id, title=c.title, code=c.code) for c in courses_db]

    # Fetch recent submissions
    subs_db = session.exec(
        select(Submission)
        .where(col(Submission.student_id) == u.id, col(Submission.is_deleted) == False)
        .options(joinedload(getattr(Submission, "assignment")))
        .order_by(col(Submission.submitted_at).desc())
        .limit(5)
    ).all()

    sub_list = [
        SubmissionBasicInfo(
            id=s.id,
            assignment_title=s.assignment.title if s.assignment else "Assignment",
            submitted_at=s.submitted_at,
            sync_status=s.sync_status.value if hasattr(s.sync_status, "value") else str(s.sync_status),
            grade=s.grade,
        )
        for s in subs_db
    ]

    # Active session count
    now = get_naive_utc_now()
    session_count = session.exec(
        select(func.count(col(RefreshToken.id))).where(
            col(RefreshToken.user_id) == u.id,
            col(RefreshToken.is_revoked) == False,
            col(RefreshToken.expires_at) > now
        )
    ).first() or 0

    user_status = getattr(u, 'status', AccountStatus.active)
    must_change = getattr(u, 'must_change_password', False)

    return AdminUserDetail(
        id=u.id,
        full_name=u.full_name,
        email=u.email,
        role=u.role,
        status=user_status,
        must_change_password=must_change,
        preferred_language=u.preferred_language,
        created_at=u.created_at,
        updated_at=u.updated_at,
        course_count=len(course_list),
        submission_count=len(sub_list),
        pending_sync_count=0,
        courses=course_list,
        recent_submissions=sub_list,
        active_session_count=session_count,
    )


def reset_user_password(
    session: Session,
    user_id: uuid.UUID,
    admin_user: User,
    mode: str = "generate",
    custom_password: Optional[str] = None,
) -> tuple[bool, Optional[str]]:
    """
    Reset a user's password, force must_change_password=True, revoke sessions, and log audit event.
    """
    u = session.get(User, user_id)
    if not u:
        return False, None

    if mode == "custom" and custom_password:
        temp_pass = custom_password
    else:
        temp_pass = secrets.token_urlsafe(10)

    u.password_hash = get_password_hash(temp_pass)
    u.must_change_password = True
    u.updated_at = get_naive_utc_now()
    session.add(u)

    # Revoke active sessions for target user
    revoke_user_sessions(session, user_id, commit=False)

    # Audit log
    create_audit_event(
        session=session,
        actor_id=admin_user.id,
        action_type=AdminActionType.password_reset,
        target_user_id=user_id,
        metadata_dict={"mode": mode, "user_email": u.email},
        commit=False,
    )

    session.commit()
    session.refresh(u)
    return True, temp_pass if mode == "generate" else None


def suspend_user(
    session: Session,
    user_id: uuid.UUID,
    admin_user: User,
) -> tuple[bool, bool]:
    """
    Suspend a user account, revoke active sessions, and log audit event.
    Returns (success, had_unsynced_work).
    """
    u = session.get(User, user_id)
    if not u:
        return False, False

    u.status = AccountStatus.suspended
    u.updated_at = get_naive_utc_now()
    session.add(u)

    # Revoke sessions
    revoke_user_sessions(session, user_id, commit=False)

    # Check unsynced work
    pending_count = session.exec(
        select(func.count(col(Submission.id))).where(
            col(Submission.student_id) == user_id,
            col(Submission.sync_status) == SyncStatus.pending
        )
    ).first() or 0

    create_audit_event(
        session=session,
        actor_id=admin_user.id,
        action_type=AdminActionType.account_suspended,
        target_user_id=user_id,
        metadata_dict={"user_email": u.email, "pending_count": pending_count},
        commit=False,
    )

    session.commit()
    return True, pending_count > 0


def reactivate_user(
    session: Session,
    user_id: uuid.UUID,
    admin_user: User,
) -> bool:
    """
    Reactivate a suspended user account and log audit event.
    """
    u = session.get(User, user_id)
    if not u:
        return False

    u.status = AccountStatus.active
    u.updated_at = get_naive_utc_now()
    session.add(u)

    create_audit_event(
        session=session,
        actor_id=admin_user.id,
        action_type=AdminActionType.account_reactivated,
        target_user_id=user_id,
        metadata_dict={"user_email": u.email},
        commit=False,
    )

    session.commit()
    return True


def force_logout_user(
    session: Session,
    user_id: uuid.UUID,
    admin_user: User,
) -> bool:
    """
    Revoke all active refresh token sessions for a user and log audit event.
    """
    u = session.get(User, user_id)
    if not u:
        return False

    revoke_user_sessions(session, user_id, commit=False)

    create_audit_event(
        session=session,
        actor_id=admin_user.id,
        action_type=AdminActionType.force_logout,
        target_user_id=user_id,
        metadata_dict={"user_email": u.email},
        commit=False,
    )

    session.commit()
    return True


def revoke_user_sessions(session: Session, user_id: uuid.UUID, commit: bool = True) -> None:
    """
    Internal helper to set is_revoked=True for all refresh tokens of a user.
    """
    tokens = session.exec(select(RefreshToken).where(col(RefreshToken.user_id) == user_id, col(RefreshToken.is_revoked) == False)).all()
    for t in tokens:
        t.is_revoked = True
        session.add(t)
    if commit:
        session.commit()


def get_recent_audit_events(session: Session, limit: int = 50) -> List[AuditEventRead]:
    """
    Retrieve recent administrative audit log entries.
    """
    events = session.exec(
        select(AdminAuditEvent)
        .order_by(col(AdminAuditEvent.created_at).desc())
        .limit(limit)
    ).all()

    results: List[AuditEventRead] = []
    for e in events:
        actor = session.get(User, e.actor_id)
        target = session.get(User, e.target_user_id) if e.target_user_id else None

        results.append(
            AuditEventRead(
                id=e.id,
                actor_id=e.actor_id,
                actor_name=actor.full_name if actor else "Unknown Admin",
                actor_email=actor.email if actor else "admin@asalahub.dev",
                action_type=e.action_type,
                target_user_id=e.target_user_id,
                target_user_name=target.full_name if target else None,
                target_user_email=target.email if target else None,
                created_at=e.created_at,
                metadata_json=e.metadata_json,
            )
        )

    return results


def get_dashboard_stats(session: Session) -> AdminDashboardStats:
    """
    Retrieve aggregate counts and statistics for the Admin Dashboard landing page.
    """
    students_count = session.exec(select(func.count(col(User.id))).where(col(User.role) == UserRole.student)).first() or 0
    educators_count = session.exec(select(func.count(col(User.id))).where(col(User.role) == UserRole.educator)).first() or 0

    active_count = session.exec(select(func.count(col(User.id))).where(col(User.status) == AccountStatus.active)).first() or 0
    suspended_count = session.exec(select(func.count(col(User.id))).where(col(User.status) == AccountStatus.suspended)).first() or 0

    unresolved = session.exec(
        select(func.count(col(Submission.id))).where(
            col(Submission.sync_status) == SyncStatus.conflict,
            col(Submission.is_deleted) == False,
            or_(
                col(Submission.resolution_status) != "resolved",
                col(Submission.resolution_status) == None,
            ),
        )
    ).first() or 0

    pending_sync = session.exec(
        select(func.count(col(Submission.id))).where(
            col(Submission.sync_status) == SyncStatus.pending,
            col(Submission.is_deleted) == False,
        )
    ).first() or 0

    recent_audits = get_recent_audit_events(session, limit=10)

    return AdminDashboardStats(
        total_students=students_count,
        total_educators=educators_count,
        active_accounts=active_count,
        suspended_accounts=suspended_count,
        unresolved_conflicts=unresolved,
        pending_sync_items=pending_sync,
        recent_audit_events=recent_audits,
    )
