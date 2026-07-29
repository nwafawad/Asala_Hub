"""
Admin API Router.

Exposes administrative endpoints for listing/resolving offline submission conflicts,
retrieving aggregate system health metrics, managing institutional guardian consent,
user/account directory management, password reset, account suspension/reactivation,
and compliance audit logging.
Enforces strict Admin RBAC requirements.
"""

from __future__ import annotations

import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query, File, UploadFile
from pydantic import BaseModel, EmailStr
from sqlmodel import Session

from app.core.database import get_session
from app.core.exceptions import ResourceNotFoundError, PermissionDeniedError, DomainException
from app.models import User, Submission, SyncStatus
from app.models.user import UserRole, AccountStatus
from app.core.dependencies import require_admin, require_role, get_current_user
from app.schemas.admin import (
    ConflictResolutionRequest,
    ConflictSubmissionRead,
    AdminHealthResponse,
    AdminUserRead,
    AdminUserDetail,
    AdminUserCreatePayload,
    AdminUserCreateResponse,
    BulkUserImportResponse,
    PasswordResetRequest,
    PasswordResetResponse,
    SuspendResponse,
    AuditEventRead,
    AdminDashboardStats,
)
import app.crud.admin as crud_admin

logger = logging.getLogger("asala_hub")
router = APIRouter(prefix="/admin", tags=["admin"])


class GuardianConsentPayload(BaseModel):
    student_id: str
    guardian_email: EmailStr
    consent_notes: Optional[str] = None


# --- Conflicts & Health ---

@router.get("/conflicts", response_model=List[ConflictSubmissionRead])
def list_unresolved_conflicts(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
) -> List[ConflictSubmissionRead]:
    return crud_admin.get_unresolved_conflicts(session, skip=skip, limit=limit)


@router.post("/conflicts/{submission_id}/resolve", response_model=ConflictSubmissionRead)
def resolve_conflict(
    submission_id: uuid.UUID,
    resolution_in: ConflictResolutionRequest,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
) -> ConflictSubmissionRead:
    submission = crud_admin.get_submission_for_resolution(session, submission_id)
    if not submission:
        raise ResourceNotFoundError("Submission", submission_id)

    if submission.sync_status != SyncStatus.conflict or submission.resolution_status == "resolved":
        raise DomainException("Submission is not in an unresolved conflict state", status_code=status.HTTP_400_BAD_REQUEST)

    resolved_sub = crud_admin.resolve_submission_conflict(
        session=session,
        submission=submission,
        resolution_in=resolution_in,
        admin_user=current_user,
    )

    assignment_title = resolved_sub.assignment.title if resolved_sub.assignment else None
    student_name = resolved_sub.student.full_name if resolved_sub.student else None
    student_email = resolved_sub.student.email if resolved_sub.student else None

    return ConflictSubmissionRead(
        id=resolved_sub.id,
        assignment_id=resolved_sub.assignment_id,
        student_id=resolved_sub.student_id,
        content=resolved_sub.content,
        submitted_at=resolved_sub.submitted_at,
        sync_status=resolved_sub.sync_status,
        grade=resolved_sub.grade,
        version=resolved_sub.version,
        resolution_status=resolved_sub.resolution_status,
        resolved_by=resolved_sub.resolved_by,
        resolved_at=resolved_sub.resolved_at,
        resolution_note=resolved_sub.resolution_note,
        assignment_title=assignment_title,
        student_name=student_name,
        student_email=student_email,
    )


@router.get("/health", response_model=AdminHealthResponse)
def get_system_health(
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
) -> AdminHealthResponse:
    return crud_admin.get_admin_health_metrics(session)


@router.get("/dashboard-stats", response_model=AdminDashboardStats)
def get_dashboard_stats(
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
) -> AdminDashboardStats:
    """
    Retrieve summary metrics and recent audit log events for the Admin Dashboard.
    """
    return crud_admin.get_dashboard_stats(session)


# --- User Management Endpoints ---

@router.post("/users", response_model=AdminUserCreateResponse, status_code=status.HTTP_201_CREATED)
def create_user_for_admin(
    payload: AdminUserCreatePayload,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> AdminUserCreateResponse:
    """
    Directly provision a new student or educator account. Requires elevated admin authentication.
    Generates temporary credentials and sets must_change_password=True.
    """
    return crud_admin.create_user_by_admin(
        session=session,
        payload=payload,
        admin_user=current_user,
    )


@router.post("/users/bulk-import", response_model=BulkUserImportResponse)
async def bulk_import_users(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> BulkUserImportResponse:
    """
    Bulk import student and educator accounts from a CSV file.
    CSV file must include 'full_name' and 'email' header columns.
    Generates temporary passwords for created accounts and returns detailed execution report.
    """
    if file.filename and not file.filename.lower().endswith(".csv") and file.content_type not in ("text/csv", "application/vnd.ms-excel", "text/plain", "application/octet-stream"):
        raise DomainException("Uploaded file must be a valid CSV file (.csv)", status_code=status.HTTP_400_BAD_REQUEST)

    contents = await file.read()
    return crud_admin.bulk_import_users_by_admin(
        session=session,
        csv_bytes=contents,
        admin_user=current_user,
    )


@router.get("/users", response_model=List[AdminUserRead])
def list_users_for_admin(
    skip: int = 0,
    limit: int = 100,
    role: Optional[UserRole] = None,
    status_filter: Optional[AccountStatus] = Query(None, alias="status"),
    search: Optional[str] = None,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> List[AdminUserRead]:
    """
    Retrieve paginated user directory rows with role/status filters and search term.
    """
    return crud_admin.get_users_for_admin(
        session=session,
        skip=skip,
        limit=limit,
        role=role,
        status_filter=status_filter,
        search=search,
    )


@router.get("/users/{user_id}", response_model=AdminUserDetail)
def get_user_detail_for_admin(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> AdminUserDetail:
    """
    Retrieve comprehensive user profile detail for account drawer view.
    """
    user_detail = crud_admin.get_user_detail_for_admin(session, user_id)
    if not user_detail:
        raise ResourceNotFoundError("User", user_id)
    return user_detail


@router.post("/users/{user_id}/reset-password", response_model=PasswordResetResponse)
def reset_user_password(
    user_id: uuid.UUID,
    body: PasswordResetRequest,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> PasswordResetResponse:
    """
    Reset user password (generated or custom). Requires elevated admin re-auth.
    Forces must_change_password=True and revokes active sessions.
    """
    success, temp_pass = crud_admin.reset_user_password(
        session=session,
        user_id=user_id,
        admin_user=current_user,
        mode=body.mode,
        custom_password=body.custom_password,
    )
    if not success:
        raise ResourceNotFoundError("User", user_id)

    msg = "Temporary password generated successfully." if body.mode == "generate" else "Custom password configured successfully."
    return PasswordResetResponse(
        success=True,
        temporary_password=temp_pass,
        message=msg
    )


@router.post("/users/{user_id}/suspend", response_model=SuspendResponse)
def suspend_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> SuspendResponse:
    """
    Suspend account, revoke active sessions, and log audit event. Requires elevated admin re-auth.
    """
    success, had_unsynced = crud_admin.suspend_user(
        session=session,
        user_id=user_id,
        admin_user=current_user,
    )
    if not success:
        raise ResourceNotFoundError("User", user_id)

    return SuspendResponse(
        success=True,
        had_unsynced_work=had_unsynced,
        message="Account suspended successfully. Active sessions revoked."
    )


@router.post("/users/{user_id}/reactivate", status_code=status.HTTP_200_OK)
def reactivate_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> dict:
    """
    Reactivate suspended account and log audit event. Requires elevated admin re-auth.
    """
    success = crud_admin.reactivate_user(
        session=session,
        user_id=user_id,
        admin_user=current_user,
    )
    if not success:
        raise ResourceNotFoundError("User", user_id)

    return {"status": "active", "message": "Account reactivated successfully."}


@router.post("/users/{user_id}/force-logout", status_code=status.HTTP_200_OK)
def force_logout_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> dict:
    """
    Revoke all active refresh token sessions for target user.
    """
    success = crud_admin.force_logout_user(
        session=session,
        user_id=user_id,
        admin_user=current_user,
    )
    if not success:
        raise ResourceNotFoundError("User", user_id)

    return {"status": "logged_out", "message": "All active sessions revoked for user."}


# --- Audit Logs ---

@router.get("/audit-events", response_model=List[AuditEventRead])
def list_audit_events(
    limit: int = 50,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> List[AuditEventRead]:
    """
    Retrieve compliance audit trail logs.
    """
    return crud_admin.get_recent_audit_events(session, limit=limit)


@router.post("/consent/guardian-notify", status_code=status.HTTP_200_OK)
def notify_guardian(
    payload: GuardianConsentPayload,
    current_user: User = Depends(require_role(UserRole.educator)),
    session: Session = Depends(get_session)
) -> dict:
    logger.info(
        f"Guardian consent notification triggered for student {payload.student_id} to guardian {payload.guardian_email}"
    )
    return {
        "status": "sent",
        "student_id": payload.student_id,
        "guardian_email": payload.guardian_email,
        "message": "Guardian consent notification processed successfully."
    }
