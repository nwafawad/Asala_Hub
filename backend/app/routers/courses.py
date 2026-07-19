"""
Course API Routers.

Exposes endpoints for creating, list-reading, detail-reading, updating,
and deleting Courses. Enforces role checking and course ownership.
"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.database import get_session
from app.models import User, Course, UserRole
from app.core.dependencies import get_current_user, require_role
from app.schemas.courses import (
    CourseCreate,
    CourseUpdate,
    CourseRead,
    CourseReadWithModules,
)
from app.crud import courses as crud_courses

router = APIRouter(prefix="/courses", tags=["courses"])

@router.post("/", response_model=CourseRead, status_code=status.HTTP_201_CREATED)
def create_course(
    course_in: CourseCreate,
    current_user: User = Depends(require_role(UserRole.educator)),
    session: Session = Depends(get_session)
):
    """
    Create a new course.
    
    Only authenticated users with the educator role are authorized to create courses.
    The educator creating the course is saved as the course owner.
    """
    # Create the course using the Courses CRUD layer
    return crud_courses.create_course(session, course_in, current_user.id)


@router.get("/", response_model=List[CourseRead])
def list_courses(
    skip: int = 0,
    limit: int = 100,
    educator_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    List all courses.
    
    Optional query parameter `educator_id` filters courses owned by a specific educator.
    Any authenticated user (students and educators) can read the list of courses.
    """
    # Query list of courses with pagination parameters
    return crud_courses.get_courses(session, skip=skip, limit=limit, educator_id=educator_id)


@router.get("/{course_id}", response_model=CourseReadWithModules)
def get_course(
    course_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Retrieve a specific course by its ID, including its nested modules.
    
    Any authenticated user can read details of a specific course.
    """
    # Fetch course and load nested child modules
    course = crud_courses.get_course_with_modules(session, course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    return course


@router.put("/{course_id}", response_model=CourseRead)
def update_course(
    course_id: uuid.UUID,
    course_in: CourseUpdate,
    current_user: User = Depends(require_role(UserRole.educator)),
    session: Session = Depends(get_session)
):
    """
    Update a course's title or description.
    
    Only the owning educator of the course is authorized to modify it.
    """
    course = crud_courses.get_course_by_id(session, course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    # Ensure current user is the course creator
    if course.educator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this course"
        )
    
    # Save updates using CRUD layer
    return crud_courses.update_course(session, course, course_in)


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.educator)),
    session: Session = Depends(get_session)
):
    """
    Delete a course.
    
    Only the owning educator of the course is authorized to delete it.
    
    Note: Child Modules and Assignments are cascade-deleted automatically
    due to the `cascade="all, delete-orphan"` constraint on the Course relationships.
    """
    course = crud_courses.get_course_by_id(session, course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    # Verify course ownership
    if course.educator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this course"
        )
    
    # Remove course from database
    crud_courses.delete_course(session, course)
    return None

