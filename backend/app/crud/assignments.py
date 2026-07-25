from __future__ import annotations

import uuid
from typing import List, Optional
from sqlmodel import Session, select
from sqlalchemy.orm import joinedload
from app.models import Assignment, Submission, SyncStatus
from app.models.user import get_naive_utc_now
from app.schemas.assignments import AssignmentCreate, AssignmentUpdate, GradeUpdate


def create_assignment(
    session: Session, assignment_in: AssignmentCreate, course_id: uuid.UUID, commit: bool = True
) -> Assignment:
    """
    Create a new assignment in a course.
    """
    assignment = Assignment(
        title=assignment_in.title,
        description=assignment_in.description,
        due_date=assignment_in.due_date,
        course_id=course_id
    )
    session.add(assignment)
    if commit:
        session.commit()
        session.refresh(assignment)
    return assignment


def get_assignments_by_course(
    session: Session, course_id: uuid.UUID, skip: int = 0, limit: int = 100
) -> List[Assignment]:
    """
    Retrieve all assignments for a specific course with pagination.
    """
    return session.exec(
        select(Assignment).where(Assignment.course_id == course_id).offset(skip).limit(limit)
    ).all()



def get_assignment_by_id_and_course(
    session: Session, assignment_id: uuid.UUID, course_id: uuid.UUID, load_course: bool = False
) -> Optional[Assignment]:
    """
    Retrieve an assignment by ID and parent course ID.
    Optionally loads the parent course eagerly to allow owner verification.
    """
    query = select(Assignment).where(Assignment.id == assignment_id, Assignment.course_id == course_id)
    if load_course:
        query = query.options(joinedload(Assignment.course))
    return session.exec(query).first()


def update_assignment(
    session: Session, db_assignment: Assignment, assignment_in: AssignmentUpdate, commit: bool = True
) -> Assignment:
    """
    Update assignment fields.
    """
    update_data = assignment_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_assignment, key, value)
    db_assignment.updated_at = get_naive_utc_now()
    session.add(db_assignment)
    if commit:
        session.commit()
        session.refresh(db_assignment)
    return db_assignment


def delete_assignment(session: Session, db_assignment: Assignment) -> None:
    """
    Delete an assignment and cascade to its child submissions.
    """
    session.delete(db_assignment)
    session.commit()


def get_submission_by_id_and_assignment(
    session: Session, submission_id: uuid.UUID, assignment_id: uuid.UUID, load_assignment_course: bool = False
) -> Optional[Submission]:
    """
    Retrieve a non-deleted submission by ID and assignment ID.
    Optionally loads the assignment and parent course eagerly.
    """
    query = select(Submission).where(
        Submission.id == submission_id,
        Submission.assignment_id == assignment_id,
        Submission.is_deleted == False
    )
    if load_assignment_course:
        query = query.options(joinedload(Submission.assignment).joinedload(Assignment.course))
    return session.exec(query).first()


def update_submission_grade(
    session: Session, db_submission: Submission, grade_in: GradeUpdate, commit: bool = True
) -> Submission:
    """
    Assign or update a grade on a student submission.
    """
    db_submission.grade = grade_in.grade
    db_submission.sync_status = SyncStatus.synced
    db_submission.updated_at = get_naive_utc_now()
    session.add(db_submission)
    if commit:
        session.commit()
        session.refresh(db_submission)
    return db_submission
