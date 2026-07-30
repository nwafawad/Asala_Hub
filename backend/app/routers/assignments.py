"""
Assignment & Submission Grading API Routers.

Exposes REST endpoints for Assignment CRUD operations and dedicated submission grading.
Enforces Educator role and course ownership authorization rules.
"""

import uuid
import json
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session

from app.core.database import get_session
from app.core.exceptions import ResourceNotFoundError, PermissionDeniedError
from app.models.base import get_naive_utc_now
from app.models import User, Course, Assignment, Submission, UserRole
from app.core.dependencies import (
    get_current_user,
    require_role,
    get_valid_course,
    get_valid_course_for_educator,
)
from app.schemas.assignments import (
    AssignmentCreate,
    AssignmentUpdate,
    AssignmentRead,
    GradeUpdate,
    SubmissionRead,
)
import app.crud.assignments as crud_assignments

router = APIRouter(tags=["assignments"])


def _get_assignment_or_raise(
    session: Session, assignment_id: uuid.UUID, course_id: uuid.UUID, user_id: Optional[uuid.UUID] = None
) -> Assignment:
    """Fetch assignment by ID and course ID or raise ResourceNotFoundError/PermissionDeniedError."""
    load_course = user_id is not None
    assignment = crud_assignments.get_assignment_by_id_and_course(
        session, assignment_id, course_id, load_course=load_course
    )
    if not assignment:
        raise ResourceNotFoundError("Assignment", assignment_id)
    if user_id is not None and assignment.course.educator_id != user_id:
        raise PermissionDeniedError("You do not have permission to modify assignments in this course")
    return assignment


@router.post("/courses/{course_id}/assignments", response_model=AssignmentRead, status_code=status.HTTP_201_CREATED)
def create_assignment(
    assignment_in: AssignmentCreate,
    course: Course = Depends(get_valid_course_for_educator),
    session: Session = Depends(get_session)
) -> Assignment:
    """
    Create a new assignment for a course.
    Only the owning Educator of the parent course is authorized to create assignments.
    """
    return crud_assignments.create_assignment(session, assignment_in, course.id)


@router.get("/courses/{course_id}/assignments", response_model=List[AssignmentRead])
def list_assignments(
    course: Course = Depends(get_valid_course),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> List[Assignment]:
    """
    List all assignments for a specific course.
    Any authenticated user can list assignments.
    """
    return crud_assignments.get_assignments_by_course(session, course.id, skip=skip, limit=limit)


@router.get("/courses/{course_id}/assignments/{assignment_id}", response_model=AssignmentRead)
def get_assignment(
    course_id: uuid.UUID,
    assignment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> Assignment:
    """
    Get details of a single assignment.
    """
    return _get_assignment_or_raise(session, assignment_id, course_id)


@router.put("/courses/{course_id}/assignments/{assignment_id}", response_model=AssignmentRead)
def update_assignment(
    course_id: uuid.UUID,
    assignment_id: uuid.UUID,
    assignment_in: AssignmentUpdate,
    current_user: User = Depends(require_role(UserRole.educator)),
    session: Session = Depends(get_session)
) -> Assignment:
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
) -> None:
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
) -> Submission:
    """
    Dedicated grading endpoint for assigning or updating a grade on a student submission.
    Requires Educator role and ownership of the parent course.
    """
    submission = crud_assignments.get_submission_by_id_and_assignment(
        session, submission_id, assignment_id, load_assignment_course=True
    )
    if not submission:
        raise ResourceNotFoundError("Submission", submission_id)
    if submission.assignment.course.educator_id != current_user.id:
        raise PermissionDeniedError("You do not have permission to grade submissions in this course")

    return crud_assignments.update_submission_grade(session, submission, grade_in)


@router.get("/assignments/my-submissions-stream")
async def stream_my_submissions_grades(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Server-Sent Events (SSE) stream for real-time grade push updates.
    Pushes instantaneous grade change events to connected client browsers.
    """
    async def event_generator():
        last_check = get_naive_utc_now()
        while True:
            try:
                # Query submissions updated since last check
                subs = session.query(Submission).filter(
                    Submission.student_id == current_user.id,
                    Submission.grade != None,
                    Submission.updated_at >= last_check
                ).all()

                if subs:
                    data = [
                        {"id": str(s.id), "grade": s.grade, "updated_at": s.updated_at.isoformat()}
                        for s in subs
                    ]
                    yield f"event: grade_update\ndata: {json.dumps(data)}\n\n"
                    last_check = get_naive_utc_now()

                yield f"event: heartbeat\ndata: {json.dumps({'status': 'alive'})}\n\n"
            except Exception:
                pass

            await asyncio.sleep(15)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
