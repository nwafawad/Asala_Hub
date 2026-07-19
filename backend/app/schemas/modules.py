import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models import ContentType

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
