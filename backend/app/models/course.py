"""
Course Models.

Defines the Course SQLModel, representing courses created by educators.
"""

import uuid
from datetime import datetime
from typing import List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

from app.models.user import get_naive_utc_now

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.module import Module
    from app.models.assignment import Assignment

class Course(SQLModel, table=True):
    """
    Database model representing a specific course of study.
    Each course is authored/owned by an educator, and contains multiple modules and assignments.
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    title: str
    description: str
    educator_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, index=True)
    created_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)
    updated_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)

    # Relationships
    educator: "User" = Relationship(back_populates="courses")
    modules: List["Module"] = Relationship(back_populates="course", sa_relationship_kwargs={"cascade": "all, delete-orphan"})
    assignments: List["Assignment"] = Relationship(back_populates="course", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

