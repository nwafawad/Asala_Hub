import uuid
from typing import List, TYPE_CHECKING, Optional
from sqlmodel import Field, Relationship
from app.models.base import TimestampedUUIDModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.module import Module
    from app.models.assignment import Assignment

class Course(TimestampedUUIDModel, table=True):
    __tablename__ = "courses"

    title: str = Field(nullable=False)
    description: str = Field(nullable=False)
    educator_id: uuid.UUID = Field(foreign_key="users.id", nullable=False)

    # Relationships
    educator: "User" = Relationship(back_populates="courses")
    modules: List["Module"] = Relationship(
        back_populates="course",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    assignments: List["Assignment"] = Relationship(
        back_populates="course",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
