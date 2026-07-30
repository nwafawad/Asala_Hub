from enum import Enum
from typing import List, Optional, TYPE_CHECKING
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
    admin = "admin"


class AccountStatus(str, Enum):
    """
    Account status for admin-managed suspension and reactivation.
    """
    active = "active"
    suspended = "suspended"


class User(TimestampModel, table=True):
    """
    Database model representing an authenticated user account (student, educator, or admin).
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
    status: AccountStatus = Field(
        default=AccountStatus.active,
        sa_column=Column(
            sa.Enum(AccountStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
            nullable=False,
            server_default="active",
        )
    )
    must_change_password: bool = Field(default=False)
    preferred_language: str = Field(default="en")
    requires_guardian_consent: bool = Field(default=False)
    guardian_email: Optional[str] = Field(default=None)

    # Relationships
    courses: List["Course"] = Relationship(back_populates="educator")
    submissions: List["Submission"] = Relationship(
        back_populates="student",
        sa_relationship_kwargs={"primaryjoin": "User.id == Submission.student_id"}
    )
    transaction_logs: List["TransactionLog"] = Relationship(back_populates="user")
