from datetime import datetime
import uuid
from enum import Enum
from typing import TYPE_CHECKING, Optional, Dict, Any
from sqlmodel import Field, Relationship, Column, Index, JSON
import sqlalchemy as sa

from app.models.base import TimestampModel

if TYPE_CHECKING:
    from app.models.course import Course


class ContentType(str, Enum):
    """
    Format of course module content.
    """
    text = "text"
    reading = "reading"
    audio = "audio"
    video = "video"
    quiz = "quiz"
    assignment = "assignment"
    pdf = "pdf"


class Module(TimestampModel, table=True):
    """
    Database model representing a single study module inside a course.
    Contains content, order index, media variants, quiz schemas, and assignment specifications.
    """
    __table_args__ = (
        Index("idx_module_course_order", "course_id", "order_index"),
    )

    course_id: uuid.UUID = Field(foreign_key="course.id", ondelete="CASCADE", nullable=False, index=True)
    title: str
    title_ar: Optional[str] = Field(default=None, nullable=True)
    content_type: ContentType = Field(
        sa_column=Column(
            sa.Enum(ContentType, native_enum=False, values_callable=lambda x: [e.value for e in x]),
            nullable=False,
        )
    )
    content: str
    order_index: int
    duration_minutes: Optional[int] = Field(default=None, nullable=True)
    points: Optional[int] = Field(default=None, nullable=True)
    due_date: Optional[datetime] = Field(default=None, nullable=True)
    media_url: Optional[str] = Field(default=None, nullable=True)
    video_offline_text: Optional[str] = Field(default=None, nullable=True)
    quiz_schema: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON, nullable=True))
    assignment_schema: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON, nullable=True))
    media_variants: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON, nullable=True))

    # Relationships
    course: "Course" = Relationship(back_populates="modules")


