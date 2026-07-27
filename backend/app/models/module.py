import uuid
from enum import Enum
from typing import TYPE_CHECKING
from sqlmodel import Field, Relationship, Column, Index
import sqlalchemy as sa

from app.models.base import TimestampModel

if TYPE_CHECKING:
    from app.models.course import Course


class ContentType(str, Enum):
    """
    Format of course module content.
    """
    text = "text"
    video = "video"


class Module(TimestampModel, table=True):
    """
    Database model representing a single study module inside a course.
    Contains content and an order index to represent ordering inside a course list.
    """
    __table_args__ = (
        Index("idx_module_course_order", "course_id", "order_index"),
    )

    course_id: uuid.UUID = Field(foreign_key="course.id", ondelete="CASCADE", nullable=False, index=True)
    title: str
    content_type: ContentType = Field(
        sa_column=Column(
            sa.Enum(ContentType, native_enum=False, values_callable=lambda x: [e.value for e in x]),
            nullable=False,
        )
    )
    content: str
    order_index: int

    # Relationships
    course: "Course" = Relationship(back_populates="modules")
