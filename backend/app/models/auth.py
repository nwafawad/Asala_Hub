"""
Authentication Database Models.

Defines RefreshToken table for managing long-lived session persistence,
multi-device authentication, token rotation, and revocation.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from sqlmodel import Field, Column, Index

from app.models.base import TimestampModel


class RefreshToken(TimestampModel, table=True):
    """
    Database model representing a long-lived user refresh token.
    Stores hashed token strings, expiration dates, and revocation flags.
    """
    __tablename__ = "refreshtoken"
    __table_args__ = (
        Index("idx_refresh_token_hash", "token_hash", unique=True),
        Index("idx_refresh_token_user_revoked", "user_id", "is_revoked"),
    )

    user_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE", nullable=False, index=True)
    token_hash: str = Field(nullable=False, unique=True)
    expires_at: datetime = Field(nullable=False)
    is_revoked: bool = Field(default=False, nullable=False)
