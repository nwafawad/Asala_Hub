import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship, Column, JSON, Index



from app.models.user import get_naive_utc_now

if TYPE_CHECKING:
    from app.models.user import User

import sqlalchemy as sa

class TransactionLog(SQLModel, table=True):
    """
    Database model representing an append-only transaction log.
    Records changes made on the client to allow syncing once internet connection is restored.
    """
    __table_args__ = (
        Index("idx_tx_log_user_synced_time", "user_id", "synced_at", "client_timestamp"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, index=True)
    entity_type: str
    entity_id: uuid.UUID
    payload: dict = Field(sa_column=Column(JSON, nullable=False))
    schema_version: int = Field(default=1, nullable=False)
    server_sequence: Optional[int] = Field(
        default=None,
        sa_column=Column(
            sa.BigInteger,
            sa.Sequence("tx_log_server_seq"),
            nullable=False
        )
    )
    server_received_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False, index=True)
    client_timestamp: datetime = Field(index=True)


    synced_at: Optional[datetime] = Field(default=None, nullable=True, index=True)
    created_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)
    updated_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)

    # Relationships
    user: "User" = Relationship(back_populates="transaction_logs")

