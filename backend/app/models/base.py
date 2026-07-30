import uuid
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field


def get_naive_utc_now() -> datetime:
    """
    Return the current time in UTC as a naive datetime object.
    
    This is required by SQLAlchemy and SQLite/PostgreSQL to prevent timezone offsets
    confusing native timestamp mappings.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


class BaseIDModel(SQLModel):
    """
    Base model providing a standard UUID primary key without redundant indices.
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)


class TimestampModel(BaseIDModel):
    """
    Base model providing automatic UTC timestamping for resource creation and updates.
    """
    created_at: datetime = Field(default_factory=get_naive_utc_now, nullable=False)
    updated_at: datetime = Field(
        default_factory=get_naive_utc_now,
        nullable=False,
        sa_column_kwargs={"onupdate": get_naive_utc_now},
    )


class SoftDeleteMixin(SQLModel):
    """
    Mixin for soft-deletable resources tracking sync versions and deletion status.
    """
    version: int = Field(default=1, nullable=False)
    is_deleted: bool = Field(default=False, nullable=False, index=True)
