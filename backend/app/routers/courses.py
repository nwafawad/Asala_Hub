"""
Course API Routers.

Exposes endpoints for creating, list-reading, detail-reading, updating,
and deleting Courses. Enforces role checking and course ownership.
"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.exceptions import ResourceNotFoundError
from app.models import User, Course, UserRole
from app.core.dependencies import (
    get_current_user,
    require_role,
    get_valid_course_for_educator,
)
from app.schemas.courses import (
    CourseCreate,
    CourseUpdate,
    CourseRead,
    CourseReadWithModules,
)
import app.crud.courses as crud_courses

router = APIRouter(prefix="/courses", tags=["courses"])


@router.post("/", response_model=CourseRead, status_code=status.HTTP_201_CREATED)
def create_course(
    course_in: CourseCreate,
    current_user: User = Depends(require_role(UserRole.educator)),
    session: Session = Depends(get_session)
) -> Course:
    """
    Create a new course.
    Only authenticated users with the educator role are authorized to create courses.
    """
    return crud_courses.create_course(session, course_in, current_user.id)


@router.get("/", response_model=List[CourseRead])
def list_courses(
    skip: int = 0,
    limit: int = 100,
    educator_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> List[Course]:
    """
    List all courses.
    Optional query parameter `educator_id` filters courses owned by a specific educator.
    """
    return crud_courses.get_courses(session, skip=skip, limit=limit, educator_id=educator_id)


@router.get("/{course_id}", response_model=CourseReadWithModules)
def get_course(
    course_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> Course:
    """
    Retrieve a specific course by its ID, including its nested modules.
    """
    course = crud_courses.get_course_with_modules(session, course_id)
    if not course:
        raise ResourceNotFoundError("Course", course_id)
    return course


@router.put("/{course_id}", response_model=CourseRead)
def update_course(
    course_in: CourseUpdate,
    course: Course = Depends(get_valid_course_for_educator),
    session: Session = Depends(get_session)
) -> Course:
    """
    Update a course's title or description.
    Only the owning educator of the course is authorized to modify it.
    """
    return crud_courses.update_course(session, course, course_in)


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course: Course = Depends(get_valid_course_for_educator),
    session: Session = Depends(get_session)
) -> None:
    """
    Delete a course.
    Only the owning educator of the course is authorized to delete it.
    """
    crud_courses.delete_course(session, course)
    return None
