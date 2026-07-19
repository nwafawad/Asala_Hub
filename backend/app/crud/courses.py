import uuid
from typing import List, Optional
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from app.models import Course
from app.schemas.courses import CourseCreate, CourseUpdate

def create_course(session: Session, course_in: CourseCreate, educator_id: uuid.UUID) -> Course:
    """Create a new course in the database."""
    course = Course(
        title=course_in.title,
        description=course_in.description,
        educator_id=educator_id
    )
    session.add(course)
    session.commit()
    session.refresh(course)
    return course

def get_courses(
    session: Session, skip: int = 0, limit: int = 100, educator_id: Optional[uuid.UUID] = None
) -> List[Course]:
    """Retrieve a list of courses, optionally filtered by educator_id."""
    query = select(Course)
    if educator_id is not None:
        query = query.where(Course.educator_id == educator_id)
    return session.exec(query.offset(skip).limit(limit)).all()

def get_course_by_id(session: Session, course_id: uuid.UUID) -> Optional[Course]:
    """Retrieve a course by its UUID."""
    return session.get(Course, course_id)

def get_course_with_modules(session: Session, course_id: uuid.UUID) -> Optional[Course]:
    """Retrieve a course with its modules loaded eagerly."""
    return session.exec(
        select(Course)
        .where(Course.id == course_id)
        .options(selectinload(Course.modules))
    ).first()

def update_course(session: Session, db_course: Course, course_in: CourseUpdate) -> Course:
    """Update course attributes."""
    update_data = course_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_course, key, value)
    session.add(db_course)
    session.commit()
    session.refresh(db_course)
    return db_course

def delete_course(session: Session, db_course: Course) -> None:
    """Delete a course from the database."""
    session.delete(db_course)
    session.commit()
