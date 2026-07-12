import uuid
from datetime import datetime
from typing import List, TYPE_CHECKING
from sqlmodel import Field, Relationship
from sqlalchemy import Column, DateTime
from app.models.base import TimestampedUUIDModel

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.submission import Submission

class Assignment(TimestampedUUIDModel, table=True):
    __tablename__ = "assignments"

    title: str = Field(nullable=False)
    description: str = Field(nullable=False)
    course_id: uuid.UUID = Field(foreign_key="courses.id", nullable=False)
    
    due_date: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )

    # Relationships
    course: "Course" = Relationship(back_populates="assignments")
    submissions: List["Submission"] = Relationship(
        back_populates="assignment",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
