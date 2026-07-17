import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship, Column, JSON, String

def get_naive_utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

# Enums
class UserRole(str, Enum):
    student = "student"
    educator = "educator"

class ContentType(str, Enum):
    text = "text"
    video = "video"

class SyncStatus(str, Enum):
    synced = "synced"
    pending = "pending"
    conflict = "conflict"

# Models
class User(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    full_name: str
    email: str = Field(unique=True, index=True)
    password_hash: str
    role: UserRole = Field(sa_column=Column(String, nullable=False))
    preferred_language: str = Field(default="en")
    created_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)
    updated_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)

    # Relationships
    courses: List["Course"] = Relationship(back_populates="educator")
    submissions: List["Submission"] = Relationship(back_populates="student")
    transaction_logs: List["TransactionLog"] = Relationship(back_populates="user")


class Course(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    title: str
    description: str
    educator_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, index=True)
    created_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)
    updated_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)

    # Relationships
    educator: User = Relationship(back_populates="courses")
    modules: List["Module"] = Relationship(back_populates="course", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    assignments: List["Assignment"] = Relationship(back_populates="course", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class Module(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", nullable=False, index=True)
    title: str
    content_type: ContentType = Field(sa_column=Column(String, nullable=False))
    content: str
    order_index: int
    created_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)
    updated_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)

    # Relationships
    course: Course = Relationship(back_populates="modules")


class Assignment(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", nullable=False, index=True)
    title: str
    description: str
    due_date: datetime
    created_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)
    updated_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)

    # Relationships
    course: Course = Relationship(back_populates="assignments")
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
    student: User = Relationship(back_populates="submissions")


class TransactionLog(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, index=True)
    entity_type: str
    entity_id: uuid.UUID
    payload: dict = Field(sa_column=Column(JSON, nullable=False))
    client_timestamp: datetime = Field(index=True)
    synced_at: Optional[datetime] = Field(default=None, nullable=True, index=True)
    created_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)
    updated_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)

    # Relationships
    user: User = Relationship(back_populates="transaction_logs")
