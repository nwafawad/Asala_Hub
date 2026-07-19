"""
Module Schemas.

Defines Pydantic schemas for creating, updating, and reading Course Module data.
"""

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models import ContentType

class ModuleCreate(BaseModel):
    """
    Schema for creating a new module.
    """
    title: str
    content_type: ContentType
    content: str
    order_index: int

class ModuleUpdate(BaseModel):
    """
    Schema for updating an existing module.
    """
    title: Optional[str] = None
    content_type: Optional[ContentType] = None
    content: Optional[str] = None
    order_index: Optional[int] = None

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
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic configuration settings."""
        from_attributes = True

