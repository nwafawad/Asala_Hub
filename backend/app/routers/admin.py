"""
Admin API Routers.

Exposes administrative endpoints for listing/resolving offline submission conflicts
and viewing aggregate system health metrics. Enforces strict Admin RBAC requirements.
"""

import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.exceptions import ResourceNotFoundError, PermissionDeniedError, DomainException
from app.models import User, Submission, SyncStatus
from app.core.dependencies import require_admin
from app.schemas.admin import (
    ConflictResolutionRequest,
    ConflictSubmissionRead,
    AdminHealthResponse,
)
import app.crud.admin as crud_admin
import app.crud.assignments as crud_assignments

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/conflicts", response_model=List[ConflictSubmissionRead])
def list_unresolved_conflicts(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
) -> List[ConflictSubmissionRead]:
    """
    List unresolved submission conflicts.
    Requires Admin role.
    """
    return crud_admin.get_unresolved_conflicts(session, skip=skip, limit=limit)


@router.post("/conflicts/{submission_id}/resolve", response_model=ConflictSubmissionRead)
def resolve_conflict(
    submission_id: uuid.UUID,
    resolution_in: ConflictResolutionRequest,
    current_user: User = Depends(require_admin),
    session: Session = Depends(get_session)
) -> ConflictSubmissionRead:
    """
    Resolve an offline submission conflict by choosing winning version or merging content.
    Requires Admin role.
    """
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


    # Convert to response DTO with student & assignment info
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
    """
    Retrieve aggregate service health metrics.
    Requires Admin role.
    """
    return crud_admin.get_admin_health_metrics(session)
