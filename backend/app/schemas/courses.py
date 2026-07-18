import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.entities import ContentType

# Module Schemas
class ModuleCreate(BaseModel):
    title: str
    content_type: ContentType
    content: str
    order_index: int

class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    content_type: Optional[ContentType] = None
    content: Optional[str] = None
    order_index: Optional[int] = None

class ModuleRead(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    content_type: ContentType
    content: str
    order_index: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Course Schemas
class CourseCreate(BaseModel):
    title: str
    description: str = ""

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class CourseRead(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    educator_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CourseReadWithModules(CourseRead):
    modules: List[ModuleRead] = []
