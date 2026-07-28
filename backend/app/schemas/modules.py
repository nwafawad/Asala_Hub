from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from app.models import ContentType


class ModuleCreate(BaseModel):
    """
    Schema for creating a new module.
    """
    title: str = Field(..., min_length=1, max_length=200, description="Module title")
    content_type: ContentType
    content: str = Field(..., description="Module text content or video media URL")
    order_index: int = Field(..., ge=0, description="Numerical index ordering within course syllabus")

class ModuleUpdate(BaseModel):
    """
    Schema for updating an existing module.
    """
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    content_type: Optional[ContentType] = None
    content: Optional[str] = None
    order_index: Optional[int] = Field(default=None, ge=0)


from typing import Optional, Dict, Any

class ModuleRead(BaseModel):
    """
    Schema representing read-only Module information.
    """
    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    content_type: ContentType
    content: str
    order_index: int
    media_variants: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)



class ModuleSyllabusRead(BaseModel):
    """
    Schema representing lightweight Module data for syllabus views,
    excluding the heavy content payload.
    """
    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    content_type: ContentType
    order_index: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


