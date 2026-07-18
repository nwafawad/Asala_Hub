import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from app.database import get_session
from app.models.entities import User, Course, Module, UserRole
from app.dependencies import get_current_user, require_role
from app.schemas.courses import (
    CourseCreate,
    CourseUpdate,
    CourseRead,
    CourseReadWithModules,
    ModuleCreate,
    ModuleUpdate,
    ModuleRead,
)

router = APIRouter(prefix="/courses", tags=["courses"])

# NOTE: The endpoints below are implemented synchronously to match the design of the database session
# and dependencies in the existing codebase. If database.py is migrated to an async engine/session,
# these routes and app/dependencies.py should be converted to async/await.

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
    course = Course(
        title=course_in.title,
        description=course_in.description,
        educator_id=current_user.id
    )
    session.add(course)
    session.commit()
    session.refresh(course)
    return course


@router.get("/", response_model=List[CourseRead])
def list_courses(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    List all courses.
    
    Any authenticated user (students and educators) can read the list of courses.
    """
    courses = session.exec(select(Course).offset(skip).limit(limit)).all()
    return courses


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
    course = session.exec(
        select(Course)
        .where(Course.id == course_id)
        .options(selectinload(Course.modules))
    ).first()
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
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    if course.educator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this course"
        )
    
    update_data = course_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(course, key, value)
    
    session.add(course)
    session.commit()
    session.refresh(course)
    return course


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
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    if course.educator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this course"
        )
    
    session.delete(course)
    session.commit()
    return None


# Module Endpoints

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
    course = session.get(Course, course_id)
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
    
    module = Module(
        course_id=course_id,
        title=module_in.title,
        content_type=module_in.content_type,
        content=module_in.content,
        order_index=module_in.order_index
    )
    session.add(module)
    session.commit()
    session.refresh(module)
    return module


@router.get("/{course_id}/modules", response_model=List[ModuleRead])
def list_modules(
    course_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    List all modules for a specific course.
    
    Any authenticated user can read modules of a course.
    """
    course = session.get(Course, course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    
    modules = session.exec(
        select(Module)
        .where(Module.course_id == course_id)
        .order_by(Module.order_index)
        .offset(skip)
        .limit(limit)
    ).all()
    return modules


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
    module = session.exec(
        select(Module)
        .where(Module.id == module_id, Module.course_id == course_id)
    ).first()
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found or does not belong to this course"
        )
    return module


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
    module = session.exec(
        select(Module)
        .join(Course)
        .where(Module.id == module_id, Module.course_id == course_id)
    ).first()
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found or does not belong to this course"
        )
    if module.course.educator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify modules in this course"
        )
    
    update_data = module_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(module, key, value)
    
    session.add(module)
    session.commit()
    session.refresh(module)
    return module


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
    module = session.exec(
        select(Module)
        .join(Course)
        .where(Module.id == module_id, Module.course_id == course_id)
    ).first()
    if not module:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Module not found or does not belong to this course"
        )
    if module.course.educator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete modules from this course"
        )
    
    session.delete(module)
    session.commit()
    return None

