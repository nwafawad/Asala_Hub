"""
Module API Routers.

Exposes endpoints for creating, list-reading, detail-reading, updating,
and deleting course Modules. Enforces course ownership validations.
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.database import get_session
from app.models import User, Course, Module, UserRole
from app.core.dependencies import get_current_user, require_role
from app.schemas.modules import (
    ModuleCreate,
    ModuleUpdate,
    ModuleRead,
    ModuleSyllabusRead,
)
from app.crud import courses as crud_courses
from app.crud import modules as crud_modules

router = APIRouter(prefix="/courses", tags=["modules"])

def _get_module_or_raise(
    session: Session, module_id: uuid.UUID, course_id: uuid.UUID, user_id: Optional[uuid.UUID] = None
) -> Module:
    """Fetch module by ID and course ID or raise 404 Not Found, checking educator ownership if user_id is provided."""
    load_course = user_id is not None
    module = crud_modules.get_module_by_id_and_course(session, module_id, course_id, load_course=load_course)
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found or does not belong to this course"
        )
    if user_id is not None and module.course.educator_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify modules in this course"
        )
    return module

@router.post("/{course_id}/modules", response_model=ModuleRead, status_code=status.HTTP_201_CREATED)
def create_module(
    course_id: uuid.UUID,
    module_in: ModuleCreate,
    current_user: User = Depends(require_role(UserRole.educator)),
    session: Session = Depends(get_session)
):
    """
    Create a module inside a course.
    
    Only the owning educator of the parent course is authorized to create a module.
    """
    course = crud_courses.get_course_by_id(session, course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    if course.educator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to add modules to this course"
        )
    
    return crud_modules.create_module(session, module_in, course_id)


@router.get("/{course_id}/modules", response_model=List[ModuleSyllabusRead])
def list_modules(
    course_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    List all modules for a specific course (syllabus).
    
    Any authenticated user can read modules of a course.
    """
    course = crud_courses.get_course_by_id(session, course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    return crud_modules.get_course_syllabus(session, course_id)


@router.get("/{course_id}/modules/{module_id}", response_model=ModuleRead)
def get_module(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get details of a single module.
    
    Any authenticated user can view a module.
    """
    return _get_module_or_raise(session, module_id, course_id)


@router.put("/{course_id}/modules/{module_id}", response_model=ModuleRead)
def update_module(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    module_in: ModuleUpdate,
    current_user: User = Depends(require_role(UserRole.educator)),
    session: Session = Depends(get_session)
):
    """
    Update a module's content or media type.
    
    Only the owning educator of the course is authorized to modify its modules.
    """
    module = _get_module_or_raise(session, module_id, course_id, current_user.id)
    return crud_modules.update_module(session, module, module_in)


@router.delete("/{course_id}/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.educator)),
    session: Session = Depends(get_session)
):
    """
    Delete a module.
    
    Only the owning educator of the course is authorized to delete its modules.
    """
    module = _get_module_or_raise(session, module_id, course_id, current_user.id)
    crud_modules.delete_module(session, module)
    return None



