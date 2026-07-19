import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship, Column, String

from app.models.user import get_naive_utc_now

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.user import User

class SyncStatus(str, Enum):
    synced = "synced"
    pending = "pending"
    conflict = "conflict"

class Assignment(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", nullable=False, index=True)
    title: str
    description: str
    due_date: datetime
    created_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)
    updated_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)

    # Relationships
    course: "Course" = Relationship(back_populates="assignments")
    submissions: List["Submission"] = Relationship(back_populates="assignment", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class Submission(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    assignment_id: uuid.UUID = Field(foreign_key="assignment.id", nullable=False, index=True)
    student_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, index=True)
    content: str
    submitted_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)
    sync_status: SyncStatus = Field(sa_column=Column(String, nullable=False, index=True))
    grade: Optional[float] = Field(default=None, nullable=True)
    created_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)
    updated_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)

    # Relationships
    assignment: Assignment = Relationship(back_populates="submissions")
    student: "User" = Relationship(back_populates="submissions")
