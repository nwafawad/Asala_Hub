from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.assignment import SyncStatus


class AssignmentCreate(BaseModel):
    """
    Schema for creating a new assignment inside a course.
    """
    title: str = Field(..., min_length=1, max_length=200, description="Assignment title")
    description: str = Field(default="", max_length=2000, description="Assignment instructions and summary")
    due_date: datetime = Field(..., description="Assignment due date")


class AssignmentUpdate(BaseModel):
    """
    Schema for updating an existing assignment.
    """
    title: Optional[str] = Field(default=None, min_length=1, max_length=200, description="Assignment title")
    description: Optional[str] = Field(default=None, max_length=2000, description="Assignment instructions and summary")
    due_date: Optional[datetime] = Field(default=None, description="Assignment due date")


class AssignmentRead(BaseModel):
    """
    Read-only schema representing an Assignment.
    """
    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    description: str
    due_date: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GradeUpdate(BaseModel):
    """
    Schema for assigning or updating a grade on a submission.
    """
    grade: float = Field(..., ge=0.0, le=100.0, description="Grade percentage value (0.0 to 100.0)")
    feedback: Optional[str] = Field(default=None, max_length=2000, description="Optional educator feedback")


class SubmissionRead(BaseModel):
    """
    Read-only schema representing a student Submission.
    """
    id: uuid.UUID
    assignment_id: uuid.UUID
    student_id: uuid.UUID
    content: str
    submitted_at: datetime
    sync_status: SyncStatus
    grade: Optional[float] = None
    version: int
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
