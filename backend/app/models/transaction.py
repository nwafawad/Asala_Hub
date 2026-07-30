import uuid
from datetime import datetime
from typing import Dict, Any, Optional, TYPE_CHECKING
from sqlmodel import Field, Relationship, Column, JSON, Index
import sqlalchemy as sa

from app.models.base import TimestampModel, get_naive_utc_now

if TYPE_CHECKING:
    from app.models.user import User


class TransactionLog(TimestampModel, table=True):
    """
    Database model representing an append-only transaction log.
    Records changes made on the client to allow syncing once internet connection is restored.
    """
    __table_args__ = (
        Index("idx_tx_log_user_synced_time", "user_id", "synced_at", "client_timestamp"),
    )

    user_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE", nullable=False, index=True)
    entity_type: str
    action: str = Field(default="UPDATE", nullable=False)
    entity_id: uuid.UUID
    payload: Dict[str, Any] = Field(sa_column=Column(JSON, nullable=False))
    schema_version: int = Field(default=1, nullable=False)
    server_sequence: Optional[int] = Field(
        default=None,
        sa_column=Column(
            sa.BigInteger,
            sa.Sequence("tx_log_server_seq"),
            nullable=True,
        )
    )

    server_received_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False, index=True)
    client_timestamp: datetime = Field(index=True)
    synced_at: Optional[datetime] = Field(default=None, nullable=True, index=True)

    # Relationships
    user: "User" = Relationship(back_populates="transaction_logs")
