import uuid
from typing import List, TYPE_CHECKING
from sqlmodel import Field, Relationship

from app.models.base import TimestampModel, SoftDeleteMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.module import Module
    from app.models.assignment import Assignment


from sqlmodel import Field, Relationship, Index


class Course(TimestampModel, SoftDeleteMixin, table=True):
    """
    Database model representing a specific course of study.
    Each course is authored/owned by an educator, and contains multiple modules and assignments.
    """
    __table_args__ = (
        Index("idx_course_active_created", "is_deleted", "created_at"),
    )

    title: str
    description: str
    educator_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE", nullable=False, index=True)


    # Relationships
    educator: "User" = Relationship(back_populates="courses")
    modules: List["Module"] = Relationship(back_populates="course", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    assignments: List["Assignment"] = Relationship(back_populates="course", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
