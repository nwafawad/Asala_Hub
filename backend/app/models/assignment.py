import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional, TYPE_CHECKING
from sqlmodel import Field, Relationship, Column, Index, UniqueConstraint
import sqlalchemy as sa

from app.models.base import TimestampModel, SoftDeleteMixin, get_naive_utc_now

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.user import User


class SyncStatus(str, Enum):
    """
    Status of resource synchronisation between client and server database.
    """
    synced = "synced"
    pending = "pending"
    conflict = "conflict"


class Assignment(TimestampModel, table=True):
    """
    Database model representing an assignment assigned inside a specific course.
    """
    __table_args__ = (
        Index("idx_assignment_course_due", "course_id", "due_date"),
    )

    course_id: uuid.UUID = Field(foreign_key="course.id", ondelete="CASCADE", nullable=False, index=True)
    title: str
    description: str
    due_date: datetime


    # Relationships
    course: "Course" = Relationship(back_populates="assignments")
    submissions: List["Submission"] = Relationship(
        back_populates="assignment",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class Submission(TimestampModel, SoftDeleteMixin, table=True):
    """
    Database model representing a student's submission to a particular assignment.
    Tracks sync status for offline-first support.
    """
    __table_args__ = (
        Index("idx_submission_assignment_student", "assignment_id", "student_id"),
        Index("idx_submission_conflict_unresolved", "sync_status", "is_deleted", "resolution_status"),
        UniqueConstraint("assignment_id", "student_id", name="uq_submission_assignment_student"),
    )


    assignment_id: uuid.UUID = Field(foreign_key="assignment.id", ondelete="CASCADE", nullable=False, index=True)
    student_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE", nullable=False, index=True)
    content: str
    submitted_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)
    sync_status: SyncStatus = Field(
        sa_column=Column(
            sa.Enum(SyncStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
            nullable=False,
            index=True,
        )
    )
    grade: Optional[float] = Field(default=None, nullable=True)
    resolution_status: Optional[str] = Field(default=None, nullable=True, index=True)
    resolved_by: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id", nullable=True)
    resolved_at: Optional[datetime] = Field(default=None, nullable=True)
    resolution_note: Optional[str] = Field(default=None, nullable=True)


    # Relationships
    assignment: Assignment = Relationship(back_populates="submissions")
    student: "User" = Relationship(
        back_populates="submissions",
        sa_relationship_kwargs={"primaryjoin": "Submission.student_id == User.id"}
    )

