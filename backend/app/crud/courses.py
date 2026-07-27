from __future__ import annotations

import uuid
from typing import List, Optional
from sqlmodel import Session, select, func, or_
from sqlalchemy.orm import selectinload, joinedload
from app.models import Course
from app.models.user import get_naive_utc_now
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
    session: Session,
    skip: int = 0,
    limit: int = 100,
    educator_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None
) -> List[Course]:
    """
    Retrieve a list of active non-deleted courses, optionally filtered by educator_id and search term.
    
    Args:
        session (Session): The active database transaction session.
        skip (int): Pagination offset count.
        limit (int): Pagination maximum count limit.
        educator_id (Optional[UUID]): Filter courses by owner educator ID.
        search (Optional[str]): Case-insensitive search string for title and description.
    Returns:
        List[Course]: List of matching Course model instances.
    """
    query = select(Course).where(Course.is_deleted == False).order_by(Course.created_at.desc())
    if educator_id is not None:
        query = query.where(Course.educator_id == educator_id)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                Course.title.ilike(search_pattern),
                Course.description.ilike(search_pattern)
            )
        )
    return session.exec(query.offset(skip).limit(limit)).all()


def count_courses(session: Session, educator_id: Optional[uuid.UUID] = None) -> int:
    """
    Count total active non-deleted courses efficiently.
    
    Args:
        session (Session): The active database transaction session.
        educator_id (Optional[UUID]): Filter by owner educator ID.
    Returns:
        int: Total number of active courses matching criteria.
    """
    query = select(func.count(Course.id)).where(Course.is_deleted == False)
    if educator_id is not None:
        query = query.where(Course.educator_id == educator_id)
    return session.exec(query).first() or 0


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


def get_course_full_detail(session: Session, course_id: uuid.UUID) -> Optional[Course]:
    """
    Retrieve an active non-deleted course with modules, assignments, and educator loaded eagerly.
    Eliminates N+1 database queries when displaying full course overviews.
    """
    return session.exec(
        select(Course)
        .where(Course.id == course_id, Course.is_deleted == False)
        .options(
            selectinload(Course.modules),
            selectinload(Course.assignments),
            joinedload(Course.educator)
        )
    ).first()


def update_course(
    session: Session, db_course: Course, course_in: CourseUpdate, commit: bool = True
) -> Course:
    """
    Update course attributes and increment sync version counter.
    
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
    db_course.version += 1
    db_course.updated_at = get_naive_utc_now()
    session.add(db_course)
    if commit:
        session.commit()
        session.refresh(db_course)
    return db_course


def delete_course(session: Session, db_course: Course, soft: bool = True) -> None:
    """
    Delete a course from the database via soft delete by default.
    
    Args:
        session (Session): The active database transaction session.
        db_course (Course): The Course model instance to delete.
        soft (bool): If True, soft-deletes by setting is_deleted=True.
    """
    if soft:
        db_course.is_deleted = True
        db_course.updated_at = get_naive_utc_now()
        session.add(db_course)
    else:
        session.delete(db_course)
    session.commit()

