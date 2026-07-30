from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.models import ContentType


class QuizOption(BaseModel):
    id: str = Field(..., description="Unique ID for option, e.g. opt-1")
    text: str = Field(..., description="Option text in English")
    text_ar: Optional[str] = Field(default=None, description="Option text in Arabic")
    is_correct: bool = Field(default=False, description="Whether option is correct answer")


class QuizQuestion(BaseModel):
    id: str = Field(..., description="Unique ID for question, e.g. q-1")
    type: str = Field(default="multiple_choice", description="multiple_choice | true_false | short_answer")
    prompt: str = Field(..., description="Question prompt text")
    prompt_ar: Optional[str] = Field(default=None, description="Question prompt in Arabic")
    options: Optional[List[QuizOption]] = Field(default=None, description="List of options if multiple choice")
    correct_answer: Optional[str] = Field(default=None, description="Correct answer for true/false or short answer")
    points: int = Field(default=10, ge=1, description="Points awarded for correct answer")
    explanation: Optional[str] = Field(default=None, description="Explanation shown after attempt")


class QuizSchema(BaseModel):
    questions: List[QuizQuestion] = Field(default_factory=list)
    passing_score_percentage: int = Field(default=70, ge=0, le=100)
    time_limit_minutes: Optional[int] = Field(default=None, ge=1)
    allow_retries: bool = Field(default=True)


class AssignmentSchema(BaseModel):
    instructions: str = Field(..., description="Assignment instructions for students")
    instructions_ar: Optional[str] = Field(default=None)
    allowed_file_types: Optional[List[str]] = Field(default=None, description="e.g. ['pdf', 'docx', 'zip']")
    max_file_size_mb: float = Field(default=10.0, ge=0.1)
    rubric_criteria: Optional[List[Dict[str, Any]]] = Field(default=None, description="Grading criteria checklist")


class ModuleCreate(BaseModel):
    """
    Schema for creating a new module.
    """
    title: str = Field(..., min_length=1, max_length=200, description="Module title")
    title_ar: Optional[str] = Field(default=None, max_length=200)
    content_type: ContentType
    content: str = Field(default="", description="Module text content or notes")
    order_index: int = Field(..., ge=0, description="Numerical index ordering within course syllabus")
    duration_minutes: Optional[int] = Field(default=15, ge=1)
    points: Optional[int] = Field(default=100, ge=0)
    due_date: Optional[datetime] = None
    media_url: Optional[str] = None
    video_offline_text: Optional[str] = None
    quiz_schema: Optional[QuizSchema] = None
    assignment_schema: Optional[AssignmentSchema] = None

    @field_validator("content_type", mode="before")
    @classmethod
    def normalize_content_type(cls, value: Any) -> Any:
        if value == "text":
            return ContentType.reading
        return value


class ModuleUpdate(BaseModel):
    """
    Schema for updating an existing module.
    """
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    title_ar: Optional[str] = Field(default=None, max_length=200)
    content_type: Optional[ContentType] = None
    content: Optional[str] = None
    order_index: Optional[int] = Field(default=None, ge=0)
    duration_minutes: Optional[int] = Field(default=None, ge=1)
    points: Optional[int] = Field(default=None, ge=0)
    due_date: Optional[datetime] = None
    media_url: Optional[str] = None
    video_offline_text: Optional[str] = None
    quiz_schema: Optional[QuizSchema] = None
    assignment_schema: Optional[AssignmentSchema] = None

    @field_validator("content_type", mode="before")
    @classmethod
    def normalize_content_type(cls, value: Any) -> Any:
        if value == "text":
            return ContentType.reading
        return value


class ModuleRead(BaseModel):
    """
    Schema representing read-only Module information.
    """
    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    title_ar: Optional[str] = None
    content_type: ContentType
    content: str
    order_index: int
    duration_minutes: Optional[int] = None
    points: Optional[int] = None
    due_date: Optional[datetime] = None
    media_url: Optional[str] = None
    video_offline_text: Optional[str] = None
    quiz_schema: Optional[Dict[str, Any]] = None
    assignment_schema: Optional[Dict[str, Any]] = None
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
    title_ar: Optional[str] = None
    content_type: ContentType
    order_index: int
    duration_minutes: Optional[int] = None
    points: Optional[int] = None
    due_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)



