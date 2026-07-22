"""
Course CRUD operations.

Handles database queries and updates relating to Course entities, including creation,
retrieval (single/list), eager loading of modules, and modification/deletion.
"""

import uuid
from typing import List, Optional
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from app.models import Course
from app.schemas.courses import CourseCreate, CourseUpdate

def create_course(
    session: Session, course_in: CourseCreate, educator_id: uuid.UUID, commit: bool = True
) -> Course:
    """
    Create a new course in the database.
    
    Args:
        session (Session): The active database transaction session.
        course_in (CourseCreate): Course creation details.
        educator_id (UUID): Owner/Author educator ID.
        commit (bool): If True, commits the transaction immediately.
    Returns:
        Course: The created Course database model instance.
    """
    course = Course(
        title=course_in.title,
        description=course_in.description,
        educator_id=educator_id
    )
    session.add(course)
    if commit:
        session.commit()
        session.refresh(course)
    return course


def get_courses(
    session: Session, skip: int = 0, limit: int = 100, educator_id: Optional[uuid.UUID] = None
) -> List[Course]:
    """
    Retrieve a list of active non-deleted courses, optionally filtered by educator_id.
    
    Args:
        session (Session): The active database transaction session.
        skip (int): Pagination offset count.
        limit (int): Pagination maximum count limit.
        educator_id (Optional[UUID]): Filter courses by owner educator ID.
    Returns:
        List[Course]: List of matching Course model instances.
    """
    query = select(Course).where(Course.is_deleted == False)
    if educator_id is not None:
        query = query.where(Course.educator_id == educator_id)
    return session.exec(query.offset(skip).limit(limit)).all()

def get_course_by_id(session: Session, course_id: uuid.UUID) -> Optional[Course]:
    """
    Retrieve an active non-deleted course by its UUID.
    
    Args:
        session (Session): The active database transaction session.
        course_id (UUID): The UUID of the course to fetch.
    Returns:
        Optional[Course]: The Course instance, or None if not found or deleted.
    """
    return session.exec(
        select(Course).where(Course.id == course_id, Course.is_deleted == False)
    ).first()

def get_course_with_modules(session: Session, course_id: uuid.UUID) -> Optional[Course]:
    """
    Retrieve an active non-deleted course with its child modules loaded eagerly.
    
    Args:
        session (Session): The active database transaction session.
        course_id (UUID): The UUID of the course to fetch.
    Returns:
        Optional[Course]: The Course instance with modules attribute loaded, or None.
    """
    return session.exec(
        select(Course)
        .where(Course.id == course_id, Course.is_deleted == False)
        .options(selectinload(Course.modules))
    ).first()

def update_course(
    session: Session, db_course: Course, course_in: CourseUpdate, commit: bool = True
) -> Course:
    """
    Update course attributes.
    
    Args:
        session (Session): The active database transaction session.
        db_course (Course): The existing Course model instance from database.
        course_in (CourseUpdate): The updated fields schema.
        commit (bool): If True, commits the transaction immediately.
    Returns:
        Course: The updated Course database model instance.
    """
    update_data = course_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_course, key, value)
    session.add(db_course)
    if commit:
        session.commit()
        session.refresh(db_course)
    return db_course


def delete_course(session: Session, db_course: Course) -> None:
    """
    Delete a course from the database.
    
    Args:
        session (Session): The active database transaction session.
        db_course (Course): The Course model instance to delete.
    """
    session.delete(db_course)
    session.commit()

