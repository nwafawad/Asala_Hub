import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, Relationship
from sqlalchemy import Column, DateTime, Float
from app.models.base import TimestampedUUIDModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.assignment import Assignment

class SyncStatus(str, enum.Enum):
    synced = "synced"
    pending = "pending"
    conflict = "conflict"

class Submission(TimestampedUUIDModel, table=True):
    __tablename__ = "submissions"

    assignment_id: uuid.UUID = Field(foreign_key="assignments.id", nullable=False)
    student_id: uuid.UUID = Field(foreign_key="users.id", nullable=False)
    content: str = Field(nullable=False)
    
    submitted_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    )
    sync_status: SyncStatus = Field(default=SyncStatus.pending, nullable=False)
    grade: Optional[float] = Field(sa_column=Column(Float, nullable=True))

    # Relationships
    assignment: "Assignment" = Relationship(back_populates="submissions")
    student: "User" = Relationship(back_populates="submissions")
