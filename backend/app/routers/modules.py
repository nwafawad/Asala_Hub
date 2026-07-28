import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.exceptions import ResourceNotFoundError, PermissionDeniedError
from app.models import User, Course, Module, UserRole
from app.core.dependencies import (
    get_current_user,
    require_role,
    get_valid_course,
    get_valid_course_for_educator,
)
from app.schemas.modules import (
    ModuleCreate,
    ModuleUpdate,
    ModuleRead,
    ModuleSyllabusRead,
)
from app.services.media_service import (
    get_module_storage_dir,
    save_uploaded_file_chunked,
    process_media_transcoding,
)
import app.crud.modules as crud_modules

router = APIRouter(prefix="/courses", tags=["modules"])



def _get_module_or_raise(
    session: Session, module_id: uuid.UUID, course_id: uuid.UUID, user_id: Optional[uuid.UUID] = None
) -> Module:
    """Fetch module by ID and course ID or raise ResourceNotFoundError/PermissionDeniedError."""
    load_course = user_id is not None
    module = crud_modules.get_module_by_id_and_course(session, module_id, course_id, load_course=load_course)
    if not module:
        raise ResourceNotFoundError("Module", module_id)
    if user_id is not None and module.course.educator_id != user_id:
        raise PermissionDeniedError("You do not have permission to modify modules in this course")
    return module


@router.post("/{course_id}/modules", response_model=ModuleRead, status_code=status.HTTP_201_CREATED)
def create_module(
    module_in: ModuleCreate,
    course: Course = Depends(get_valid_course_for_educator),
    session: Session = Depends(get_session)
) -> Module:
    """
    Create a module inside a course.
    Only the owning educator of the parent course is authorized to create a module.
    """
    return crud_modules.create_module(session, module_in, course.id)


@router.get("/{course_id}/modules", response_model=List[ModuleSyllabusRead])
def list_modules(
    course: Course = Depends(get_valid_course),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> List[Module]:
    """
    List all modules for a specific course (syllabus).
    Any authenticated user can read modules of a course.
    """
    return crud_modules.get_course_syllabus(session, course.id)


@router.get("/{course_id}/modules/{module_id}", response_model=ModuleRead)
def get_module(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> Module:
    """
    Get details of a single module.
    """
    return _get_module_or_raise(session, module_id, course_id)


@router.put("/{course_id}/modules/{module_id}", response_model=ModuleRead)
def update_module(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    module_in: ModuleUpdate,
    current_user: User = Depends(require_role(UserRole.educator)),
    session: Session = Depends(get_session)
) -> Module:
    """
    Update a module's content or media type.
    Only the owning educator of the course is authorized to modify its modules.
    """
    module = _get_module_or_raise(session, module_id, course_id, current_user.id)
    return crud_modules.update_module(session, module, module_in)


@router.post("/{course_id}/modules/{module_id}/media", status_code=status.HTTP_202_ACCEPTED)

def upload_module_media(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(UserRole.educator)),
    session: Session = Depends(get_session)
):
    """
    Accept chunked media upload for a course module, store original file,
    and trigger background FFmpeg audio extraction & text summary generation per FR-8.
    Requires Educator role and ownership of parent course.
    """
    module = _get_module_or_raise(session, module_id, course_id, current_user.id)
    target_dir = get_module_storage_dir(module_id)
    original_filename = file.filename or "media.mp4"
    ext = os.path.splitext(original_filename)[1].lower() or ".mp4"
    dest_path = os.path.join(target_dir, f"original{ext}")

    # Chunked stream save to disk
    save_uploaded_file_chunked(file, dest_path)

    # Queue background transcoding task
    background_tasks.add_task(
        process_media_transcoding,
        module_id=module_id,
        original_file_path=dest_path,
        original_filename=original_filename,
        module_title=module.title
    )

    return {
        "status": "processing",
        "message": "Media file uploaded successfully and transcoding job queued.",
        "module_id": str(module_id),
        "original_filename": original_filename,
    }


@router.delete("/{course_id}/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_module(
    course_id: uuid.UUID,
    module_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.educator)),
    session: Session = Depends(get_session)
) -> None:
    """
    Delete a module.
    Only the owning educator of the course is authorized to delete its modules.
    """
    module = _get_module_or_raise(session, module_id, course_id, current_user.id)
    crud_modules.delete_module(session, module)
    return None

