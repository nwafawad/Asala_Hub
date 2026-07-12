import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlmodel import Field, Relationship
from sqlalchemy import Column, DateTime, JSON
from app.models.base import TimestampedUUIDModel

if TYPE_CHECKING:
    from app.models.user import User

class TransactionLog(TimestampedUUIDModel, table=True):
    __tablename__ = "transaction_logs"

    user_id: uuid.UUID = Field(foreign_key="users.id", nullable=False)
    entity_type: str = Field(nullable=False)
    entity_id: uuid.UUID = Field(nullable=False)
    
    payload: dict = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False)
    )
    
    client_timestamp: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    
    synced_at: Optional[datetime] = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True)
    )

    # Relationships
    user: "User" = Relationship(back_populates="transaction_logs")
