"""
Assignment & Submission Grading API Routers.

Exposes REST endpoints for Assignment CRUD operations and dedicated submission grading.
Enforces Educator role and course ownership authorization rules.
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.database import get_session
from app.models import User, Assignment, Submission, UserRole
from app.core.dependencies import get_current_user, require_role
from app.schemas.assignments import (
    AssignmentCreate,
    AssignmentUpdate,
    AssignmentRead,
    GradeUpdate,
    SubmissionRead,
)
from app.crud import courses as crud_courses
from app.crud import assignments as crud_assignments

router = APIRouter(tags=["assignments"])


def _get_assignment_or_raise(
    session: Session, assignment_id: uuid.UUID, course_id: uuid.UUID, user_id: Optional[uuid.UUID] = None
) -> Assignment:
    """Fetch assignment by ID and course ID or raise 404, checking educator course ownership if user_id is provided."""
    load_course = user_id is not None
    assignment = crud_assignments.get_assignment_by_id_and_course(
        session, assignment_id, course_id, load_course=load_course
    )
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found or does not belong to this course"
        )
    if user_id is not None and assignment.course.educator_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify assignments in this course"
        )
    return assignment


@router.post("/courses/{course_id}/assignments", response_model=AssignmentRead, status_code=status.HTTP_201_CREATED)
def create_assignment(
    course_id: uuid.UUID,
    assignment_in: AssignmentCreate,
    current_user: User = Depends(require_role(UserRole.educator)),
    session: Session = Depends(get_session)
):
    """
    Create a new assignment for a course.
    
    Only the owning Educator of the parent course is authorized to create assignments.
    """
    course = crud_courses.get_course_by_id(session, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if course.educator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to add assignments to this course"
        )
    return crud_assignments.create_assignment(session, assignment_in, course_id)


@router.get("/courses/{course_id}/assignments", response_model=List[AssignmentRead])
def list_assignments(
    course_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    List all assignments for a specific course.
    
    Any authenticated user can list assignments.
    """
    course = crud_courses.get_course_by_id(session, course_id)
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return crud_assignments.get_assignments_by_course(session, course_id, skip=skip, limit=limit)



@router.get("/courses/{course_id}/assignments/{assignment_id}", response_model=AssignmentRead)
def get_assignment(
    course_id: uuid.UUID,
    assignment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get details of a single assignment.
    
    Any authenticated user can view an assignment.
    """
    return _get_assignment_or_raise(session, assignment_id, course_id)


@router.put("/courses/{course_id}/assignments/{assignment_id}", response_model=AssignmentRead)
def update_assignment(
    course_id: uuid.UUID,
    assignment_id: uuid.UUID,
    assignment_in: AssignmentUpdate,
    current_user: User = Depends(require_role(UserRole.educator)),
    session: Session = Depends(get_session)
):
    """
    Update an assignment's title, description, or due date.
    
    Only the owning Educator of the parent course is authorized to update assignments.
    """
    assignment = _get_assignment_or_raise(session, assignment_id, course_id, current_user.id)
    return crud_assignments.update_assignment(session, assignment, assignment_in)


@router.delete("/courses/{course_id}/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    course_id: uuid.UUID,
    assignment_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.educator)),
    session: Session = Depends(get_session)
):
    """
    Delete an assignment.
    
    Only the owning Educator of the parent course is authorized to delete assignments.
    Cascades to delete all child submissions.
    """
    assignment = _get_assignment_or_raise(session, assignment_id, course_id, current_user.id)
    crud_assignments.delete_assignment(session, assignment)
    return None


@router.put("/assignments/{assignment_id}/submissions/{submission_id}/grade", response_model=SubmissionRead)
def grade_submission(
    assignment_id: uuid.UUID,
    submission_id: uuid.UUID,
    grade_in: GradeUpdate,
    current_user: User = Depends(require_role(UserRole.educator)),
    session: Session = Depends(get_session)
):
    """
    Dedicated grading endpoint for assigning or updating a grade on a student submission.
    
    This is the ONLY sanctioned path for setting Submission.grade over HTTP.
    Requires Educator role and ownership of the parent course.
    """
    submission = crud_assignments.get_submission_by_id_and_assignment(
        session, submission_id, assignment_id, load_assignment_course=True
    )
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found for this assignment"
        )
    if submission.assignment.course.educator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to grade submissions in this course"
        )

    return crud_assignments.update_submission_grade(session, submission, grade_in)
