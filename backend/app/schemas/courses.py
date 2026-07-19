"""
Course Schemas.

Defines Pydantic schemas for creating, updating, and reading Course data.
"""

import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.modules import ModuleRead

class CourseCreate(BaseModel):
    """
    Schema for creating a new course.
    """
    title: str
    description: str = ""

class CourseUpdate(BaseModel):
    """
    Schema for updating an existing course.
    """
    title: Optional[str] = None
    description: Optional[str] = None

class CourseRead(BaseModel):
    """
    Schema representing read-only Course information.
    """
    id: uuid.UUID
    title: str
    description: str
    educator_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic configuration settings."""
        from_attributes = True

class CourseReadWithModules(CourseRead):
    """
    Schema representing Course details along with its nested modules list.
    """
    modules: List[ModuleRead] = []

