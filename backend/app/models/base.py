import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel
from sqlalchemy import DateTime, func

class TimestampedUUIDModel(SQLModel):
    """Base model providing UUID primary keys and server-default timestamps."""
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        primary_key=True,
        index=True,
        nullable=False
    )
    created_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={
            "server_default": func.now(),
            "nullable": False
        }
    )
    updated_at: datetime = Field(
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={
            "server_default": func.now(),
            "onupdate": func.now(),
            "nullable": False
        }
    )
