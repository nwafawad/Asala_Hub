from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


CURRENT_SCHEMA_VERSION = 1
MIN_SUPPORTED_SCHEMA_VERSION = 1


def _coerce_uuid(val: Any) -> uuid.UUID:
    if isinstance(val, uuid.UUID):
        return val
    val_str = str(val).strip()
    try:
        return uuid.UUID(val_str)
    except Exception:
        # Fallback to deterministic UUID v5 if non-hex string ID (e.g. "mod-123", "course-cs101")
        return uuid.uuid5(uuid.NAMESPACE_DNS, val_str)


class SubmissionContentPayload(BaseModel):
    """
    Student-facing payload schema for submitting or updating assignment content.
    Does NOT contain a grade field, preventing clients from smuggling grade modifications (BR-4).
    """
    assignment_id: uuid.UUID
    content: str = ""
    version: Optional[int] = 1

    @field_validator("assignment_id", mode="before")
    @classmethod
    def validate_assignment_id(cls, v: Any) -> uuid.UUID:
        return _coerce_uuid(v)


class GradePayload(BaseModel):
    """
    Educator-facing payload schema for offline grade writes.
    """
    grade: float = Field(..., ge=0.0, le=100.0, description="Grade percentage value (0.0 to 100.0)")
    version: Optional[int] = 1

# Backward-compatibility alias
SubmissionPayloadSchema = SubmissionContentPayload


class SyncTransactionIn(BaseModel):
    transaction_id: uuid.UUID
    entity_type: str = Field(..., description="Entity type being mutated (e.g., 'submission')")
    entity_id: uuid.UUID
    action: str = Field(..., description="Mutation action: CREATE, UPDATE, DELETE")
    payload: Dict[str, Any]
    client_timestamp: datetime
    schema_version: int = Field(
        default=CURRENT_SCHEMA_VERSION,
        description="Schema version of the transaction payload for backward compatibility"
    )

    @field_validator("transaction_id", "entity_id", mode="before")
    @classmethod
    def validate_uuids(cls, v: Any) -> uuid.UUID:
        return _coerce_uuid(v)

class SyncBatchRequest(BaseModel):
    client_last_acked_id: Optional[int] = Field(
        default=None,
        description="Last acknowledged local IndexedDB log ID for resume-from-last-ack (FR-16)"
    )
    transactions: List[SyncTransactionIn]

class SyncTransactionResult(BaseModel):
    transaction_id: uuid.UUID
    status: str = Field(..., description="'accepted', 'rejected', 'skipped', or 'unsupported_schema_version'")
    server_sequence: Optional[int] = Field(default=None, description="Authoritative server-assigned sequence number")
    synced_at: Optional[datetime] = None
    error: Optional[str] = None



class SyncBatchResponse(BaseModel):
    results: List[SyncTransactionResult]
    synced_count: int
    error_count: int
