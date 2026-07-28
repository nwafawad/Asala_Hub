from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, Dict, Literal
from pydantic import BaseModel, Field

from app.models.assignment import SyncStatus


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
