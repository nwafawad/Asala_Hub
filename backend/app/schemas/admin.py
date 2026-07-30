from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Literal
from pydantic import BaseModel, Field, EmailStr

from app.models.assignment import SyncStatus
from app.models.user import UserRole, AccountStatus
from app.models.audit import AdminActionType


class ConflictResolutionRequest(BaseModel):
    """
    Schema for resolving an unresolved submission conflict.
    """
    strategy: Literal["keep_server", "accept_client", "manual_merge"] = Field(
        ...,
        description="Resolution strategy: keep_server, accept_client, or manual_merge"
    )
    content: Optional[str] = Field(
        default=None,
        description="New content payload if strategy is accept_client or manual_merge"
    )
    grade: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=100.0,
        description="Optional grade to assign to submission upon resolution"
    )
    resolution_note: Optional[str] = Field(
        default=None,
        description="Admin resolution notes or rationale"
    )


class ConflictSubmissionRead(BaseModel):
    """
    Response schema for listing submission conflicts.
    """
    id: uuid.UUID
    assignment_id: uuid.UUID
    student_id: uuid.UUID
    content: str
    submitted_at: datetime
    sync_status: SyncStatus
    grade: Optional[float] = None
    version: int
    resolution_status: Optional[str] = None
    resolved_by: Optional[uuid.UUID] = None
    resolved_at: Optional[datetime] = None
    resolution_note: Optional[str] = None
    assignment_title: Optional[str] = None
    student_name: Optional[str] = None
    student_email: Optional[str] = None

    model_config = {
        "from_attributes": True
    }


class AdminHealthResponse(BaseModel):
    """
    Response schema for aggregate service health metrics.
    """
    status: str
    database: str
    total_transaction_logs: int
    unresolved_conflicts: int
    max_server_sequence: int
    users_count: Dict[str, int]


class AdminUserRead(BaseModel):
    """
    Schema for user directory table rows in the admin console.
    """
    id: uuid.UUID
    full_name: str
    email: str
    role: UserRole
    status: AccountStatus
    must_change_password: bool
    preferred_language: str
    created_at: datetime
    updated_at: datetime
    course_count: int = 0
    submission_count: int = 0
    pending_sync_count: int = 0

    model_config = {
        "from_attributes": True
    }


class CourseBasicInfo(BaseModel):
    id: uuid.UUID
    title: str


class SubmissionBasicInfo(BaseModel):
    id: uuid.UUID
    assignment_title: str
    submitted_at: datetime
    sync_status: str
    grade: Optional[float] = None


class AdminUserDetail(AdminUserRead):
    """
    Extended user detail schema for the account drawer view.
    """
    courses: List[CourseBasicInfo] = []
    recent_submissions: List[SubmissionBasicInfo] = []
    active_session_count: int = 0


class AdminUserCreatePayload(BaseModel):
    """
    Payload for administrative direct account creation.
    """
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    role: UserRole = UserRole.student
    preferred_language: str = Field(default="en", max_length=10)
    mode: Literal["generate", "custom"] = "generate"
    custom_password: Optional[str] = Field(
        default=None,
        min_length=6,
        description="Custom initial password string when mode is 'custom'"
    )


class AdminUserCreateResponse(BaseModel):
    """
    Response package for administrative account creation.
    """
    user: AdminUserRead
    temporary_password: str
    message: str


class BulkUserCreatedItem(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    role: UserRole
    temporary_password: str


class BulkUserImportError(BaseModel):
    row_number: int
    email: Optional[str] = None
    reason: str


class BulkUserImportResponse(BaseModel):
    total_rows: int
    success_count: int
    skipped_count: int
    created_users: List[BulkUserCreatedItem] = []
    errors: List[BulkUserImportError] = []
    message: str


class PasswordResetRequest(BaseModel):
    """
    Payload for administrative password reset.
    """
    mode: Literal["generate", "custom"] = "generate"
    custom_password: Optional[str] = Field(
        default=None,
        min_length=6,
        description="Custom password string when mode is 'custom'"
    )


class PasswordResetResponse(BaseModel):
    """
    Response package for administrative password reset.
    """
    success: bool
    temporary_password: Optional[str] = Field(
        default=None,
        description="Generated temporary password string (shown once)"
    )
    message: str


class SuspendResponse(BaseModel):
    """
    Response package for account suspension.
    """
    success: bool
    had_unsynced_work: bool = False
    message: str


class AuditEventRead(BaseModel):
    """
    Response schema for single audit event log item.
    """
    id: uuid.UUID
    actor_id: uuid.UUID
    actor_name: str
    actor_email: str
    action_type: AdminActionType
    target_user_id: Optional[uuid.UUID] = None
    target_user_name: Optional[str] = None
    target_user_email: Optional[str] = None
    created_at: datetime
    metadata_json: Optional[str] = None

    model_config = {
        "from_attributes": True
    }


class AdminDashboardStats(BaseModel):
    """
    Aggregated summary statistics for the admin dashboard.
    """
    total_students: int = 0
    total_educators: int = 0
    active_accounts: int = 0
    suspended_accounts: int = 0
    unresolved_conflicts: int = 0
    pending_sync_items: int = 0
    recent_audit_events: List[AuditEventRead] = []
