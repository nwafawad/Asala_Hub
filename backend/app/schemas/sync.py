from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SubmissionPayloadSchema(BaseModel):
    assignment_id: uuid.UUID
    content: str = ""
    version: Optional[int] = 1

class SyncTransactionIn(BaseModel):
    transaction_id: uuid.UUID
    entity_type: str = Field(..., description="Entity type being mutated (e.g., 'submission')")
    entity_id: uuid.UUID
    action: str = Field(..., description="Mutation action: CREATE, UPDATE, DELETE")
    payload: Dict[str, Any]
    client_timestamp: datetime

class SyncBatchRequest(BaseModel):
    transactions: List[SyncTransactionIn]

class SyncTransactionResult(BaseModel):
    transaction_id: uuid.UUID
    status: str = Field(..., description="'accepted', 'rejected', or 'skipped'")
    synced_at: Optional[datetime] = None
    error: Optional[str] = None

class SyncBatchResponse(BaseModel):
    results: List[SyncTransactionResult]
    synced_count: int
    error_count: int
