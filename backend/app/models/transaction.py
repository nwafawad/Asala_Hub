import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship, Column, JSON

from app.models.user import get_naive_utc_now

if TYPE_CHECKING:
    from app.models.user import User

class TransactionLog(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, index=True)
    entity_type: str
    entity_id: uuid.UUID
    payload: dict = Field(sa_column=Column(JSON, nullable=False))
    client_timestamp: datetime = Field(index=True)
    synced_at: Optional[datetime] = Field(default=None, nullable=True, index=True)
    created_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)
    updated_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)

    # Relationships
    user: "User" = Relationship(back_populates="transaction_logs")
