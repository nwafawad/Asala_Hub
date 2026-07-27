from enum import Enum
from typing import List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship, Column
import sqlalchemy as sa

from app.models.base import TimestampModel, get_naive_utc_now

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.assignment import Submission
    from app.models.transaction import TransactionLog


class UserRole(str, Enum):
    """
    Roles governing authorization levels in the application.
    """
    student = "student"
    educator = "educator"


class User(TimestampModel, table=True):
    """
    Database model representing an authenticated user account (student or educator).
    """
    full_name: str
    email: str = Field(unique=True, index=True)
    password_hash: str
    role: UserRole = Field(
        sa_column=Column(
            sa.Enum(UserRole, native_enum=False, values_callable=lambda x: [e.value for e in x]),
            nullable=False,
        )
    )
    preferred_language: str = Field(default="en")

    # Relationships
    courses: List["Course"] = Relationship(back_populates="educator")
    submissions: List["Submission"] = Relationship(back_populates="student")
    transaction_logs: List["TransactionLog"] = Relationship(back_populates="user")
