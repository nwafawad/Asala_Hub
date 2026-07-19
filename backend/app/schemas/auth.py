"""
Authentication Schemas.

Defines Pydantic schemas for registering users, authenticating credentials,
generating JWT responses, and returning serialized profile information.
"""

import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr
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

class UserLogin(BaseModel):
    """
    Schema representing user login credentials.
    """
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    """
    Schema representing successful JWT authentication response package.
    """
    access_token: str
    token_type: str = "bearer"

class UserRead(BaseModel):
    """
    Schema representing read-only user profile structure returned in API responses.
    """
    id: uuid.UUID
    full_name: str
    email: str
    role: UserRole
    preferred_language: str
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic configuration settings."""
        from_attributes = True

