from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class CourseCreate(BaseModel):
    """
    Schema for creating a new course.
    """
    title: str = Field(..., min_length=1, max_length=200, description="Course title")
    description: str = Field(default="", max_length=2000, description="Course summary description")

class CourseUpdate(BaseModel):
    """
    Schema for updating an existing course.
    """
    title: Optional[str] = Field(default=None, min_length=1, max_length=200, description="Course title")
    description: Optional[str] = Field(default=None, max_length=2000, description="Course summary description")


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

    model_config = ConfigDict(from_attributes=True)

class CourseReadWithModules(CourseRead):
    """
    Schema representing Course details along with its nested modules list.
    """
    modules: List[ModuleRead] = []

