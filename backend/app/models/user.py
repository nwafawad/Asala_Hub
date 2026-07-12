import enum
from typing import List, TYPE_CHECKING
from sqlmodel import Field, Relationship
from app.models.base import TimestampedUUIDModel

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.submission import Submission
    from app.models.transaction import TransactionLog

class UserRole(str, enum.Enum):
    student = "student"
    educator = "educator"

class User(TimestampedUUIDModel, table=True):
    __tablename__ = "users"

    full_name: str
    email: str = Field(unique=True, index=True, nullable=False)
    password_hash: str
    role: UserRole = Field(nullable=False)
    preferred_language: str = Field(default="en", nullable=False)

    # Relationships
    courses: List["Course"] = Relationship(back_populates="educator")
    submissions: List["Submission"] = Relationship(back_populates="student")
    transaction_logs: List["TransactionLog"] = Relationship(back_populates="user")
