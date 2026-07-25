import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship, Column, String



if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.assignment import Submission
    from app.models.transaction import TransactionLog

def get_naive_utc_now() -> datetime:
    """
    Return the current time in UTC as a naive datetime object.
    
    This is required by SQLAlchemy and SQLite/PostgreSQL to prevent timezone offsets
    confusing native timestamp mappings.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)

class UserRole(str, Enum):
    """
    Roles governing authorization levels in the application.
    """
    student = "student"
    educator = "educator"

class User(SQLModel, table=True):
    """
    Database model representing an authenticated user account (student or educator).
    """
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

