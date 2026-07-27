from __future__ import annotations

import uuid
from typing import List, Optional
from sqlmodel import Session, select, col
from sqlalchemy.orm import joinedload
from app.models import Assignment, Submission, SyncStatus
from app.models.base import get_naive_utc_now
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
    Retrieve all assignments for a specific course with pagination, ordered by creation date.
    """
    return list(session.exec(
        select(Assignment)
        .where(col(Assignment.course_id) == course_id)
        .order_by(col(Assignment.created_at).desc())
        .offset(skip)
        .limit(limit)
    ).all())



def get_assignment_by_id_and_course(
    session: Session, assignment_id: uuid.UUID, course_id: uuid.UUID, load_course: bool = False
) -> Optional[Assignment]:
    """
    Retrieve an assignment by ID and parent course ID.
    Optionally loads the parent course eagerly to allow owner verification.
    """
    query = select(Assignment).where(col(Assignment.id) == assignment_id, col(Assignment.course_id) == course_id)
    if load_course:
        query = query.options(joinedload(getattr(Assignment, "course")))
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


def delete_assignment(session: Session, db_assignment: Assignment, commit: bool = True) -> None:
    """
    Delete an assignment and cascade to its child submissions.
    """
    session.delete(db_assignment)
    if commit:
        session.commit()


def get_submission_by_id_and_assignment(
    session: Session, submission_id: uuid.UUID, assignment_id: uuid.UUID, load_assignment_course: bool = False
) -> Optional[Submission]:
    """
    Retrieve a non-deleted submission by ID and assignment ID.
    Optionally loads the assignment and parent course eagerly.
    """
    query = select(Submission).where(
        col(Submission.id) == submission_id,
        col(Submission.assignment_id) == assignment_id,
        col(Submission.is_deleted) == False
    )
    if load_assignment_course:
        query = query.options(joinedload(getattr(Submission, "assignment")).joinedload(getattr(Assignment, "course")))
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


def get_submissions_by_assignment(
    session: Session,
    assignment_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
    load_student: bool = False
) -> List[Submission]:
    """
    Retrieve active non-deleted submissions for an assignment.
    Optionally eagerly loads the student profile to prevent N+1 queries.
    """
    query = select(Submission).where(
        col(Submission.assignment_id) == assignment_id,
        col(Submission.is_deleted) == False
    ).order_by(col(Submission.submitted_at).desc())

    if load_student:
        query = query.options(joinedload(getattr(Submission, "student")))

    return list(session.exec(query.offset(skip).limit(limit)).all())


def get_user_submission_for_assignment(
    session: Session, assignment_id: uuid.UUID, student_id: uuid.UUID
) -> Optional[Submission]:
    """
    Retrieve a student's active submission for a specific assignment.
    """
    return session.exec(
        select(Submission).where(
            col(Submission.assignment_id) == assignment_id,
            col(Submission.student_id) == student_id,
            col(Submission.is_deleted) == False
        )
    ).first()


def delete_submission(session: Session, db_submission: Submission, soft: bool = True, commit: bool = True) -> None:
    """
    Delete a submission (soft delete by default).
    """
    if soft:
        db_submission.is_deleted = True
        db_submission.updated_at = get_naive_utc_now()
        session.add(db_submission)
    else:
        session.delete(db_submission)
    if commit:
        session.commit()
