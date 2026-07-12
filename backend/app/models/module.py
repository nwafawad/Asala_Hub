import enum
import uuid
from typing import TYPE_CHECKING
from sqlmodel import Field, Relationship
from app.models.base import TimestampedUUIDModel

if TYPE_CHECKING:
    from app.models.course import Course

class ModuleContentType(str, enum.Enum):
    text = "text"
    video = "video"

class Module(TimestampedUUIDModel, table=True):
    __tablename__ = "modules"

    title: str = Field(nullable=False)
    course_id: uuid.UUID = Field(foreign_key="courses.id", nullable=False)
    content_type: ModuleContentType = Field(nullable=False)
    content: str = Field(nullable=False)
    order_index: int = Field(nullable=False)

    # Relationships
    course: "Course" = Relationship(back_populates="modules")
