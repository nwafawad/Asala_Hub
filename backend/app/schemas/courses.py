import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.modules import ModuleRead

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
