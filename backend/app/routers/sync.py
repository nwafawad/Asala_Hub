"""
Sync Engine API Router.

Exposes endpoint for processing offline batch transactions from client IndexedDB queue (FR-20).
"""

from fastapi import APIRouter, Depends, status, BackgroundTasks
from sqlmodel import Session

from app.core.database import get_session
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.sync import SyncBatchRequest, SyncBatchResponse
from app.services import sync_service

router = APIRouter(prefix="/sync", tags=["Sync Engine"])


@router.post("", response_model=SyncBatchResponse, status_code=status.HTTP_200_OK)
def sync_batch(
    batch: SyncBatchRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> SyncBatchResponse:
    """
    Accepts a batch of offline transaction logs from client IndexedDB queue (FR-20).
    Processes entity mutations idempotently and updates sync records.

    **Schema Versioning**:
    - **Current Schema Version**: `1`
    - **Minimum Supported Schema Version**: `1`
    - **Default Version**: `1` (if omitted by legacy callers)

    Transactions sending a `schema_version` below `MIN_SUPPORTED_SCHEMA_VERSION` will be rejected
    per-transaction with `status: "unsupported_schema_version"`. Older supported schema versions
    are automatically normalized before processing.
    """
    response = sync_service.process_sync_batch(db, current_user.id, batch)
    background_tasks.add_task(
        sync_service.post_sync_telemetry, current_user.id, response.synced_count
    )
    return response
