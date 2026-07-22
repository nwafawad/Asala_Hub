"""
Module Models.

Defines the Module SQLModel representing modules within a course,
and the ContentType enum representing the content formats (text/video).
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship, Column, String, Index

from app.models.user import get_naive_utc_now

if TYPE_CHECKING:
    from app.models.course import Course

class ContentType(str, Enum):
    """
    Format of course module content.
    """
    text = "text"
    video = "video"

class Module(SQLModel, table=True):
    """
    Database model representing a single study module inside a course.
    Contains content and an order index to represent ordering inside a course list.
    """
    __table_args__ = (
        Index("idx_module_course_order", "course_id", "order_index"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    course_id: uuid.UUID = Field(foreign_key="course.id", nullable=False, index=True)
    title: str
    content_type: ContentType = Field(sa_column=Column(String, nullable=False))
    content: str
    order_index: int
    created_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)
    updated_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)

    # Relationships
    course: "Course" = Relationship(back_populates="modules")


