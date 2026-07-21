from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.sync import SyncBatchRequest, SyncBatchResponse
from app.crud.sync import process_sync_batch

router = APIRouter(prefix="/sync", tags=["Sync Engine"])

@router.post("", response_model=SyncBatchResponse, status_code=status.HTTP_200_OK)
def sync_batch(
    batch: SyncBatchRequest,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> SyncBatchResponse:
    """
    Accepts a batch of offline transaction logs from client IndexedDB queue.
    Processes entity mutations idempotently and updates sync records.
    """
    return process_sync_batch(db, current_user.id, batch)
