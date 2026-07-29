from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models import UserRole

class UserRegister(BaseModel):
    """
    Schema representing user registration payload parameters.
    """
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.student
    preferred_language: str = "en"
    requires_guardian_consent: bool = False
    guardian_email: Optional[str] = None

class UserLogin(BaseModel):
    """
    Schema representing user login credentials.
    """
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    """
    Schema representing successful JWT authentication response package containing access and refresh tokens.
    """
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"

class TokenRefreshRequest(BaseModel):
    """
    Schema representing explicit token refresh request body payload (optional fallback if HttpOnly cookie not present).
    """
    refresh_token: Optional[str] = None


class RoleSwitchRequest(BaseModel):
    """
    Schema representing a request to switch the active role of an authenticated user.
    """
    role: UserRole


class UserRead(BaseModel):
    """
    Schema representing read-only user profile structure returned in API responses.
    """
    id: uuid.UUID
    full_name: str
    email: str
    role: UserRole
    status: str = "active"
    must_change_password: bool = False
    preferred_language: str
    requires_guardian_consent: bool = False
    guardian_email: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserAuthClaims(BaseModel):
    """
    Lightweight schema representing decoded JWT claims for dependency injection.
    """
    user_id: uuid.UUID
    role: UserRole
    email: Optional[str] = None

    @property
    def id(self) -> uuid.UUID:
        """Alias for user_id to maintain interface parity with User model."""
        return self.user_id




