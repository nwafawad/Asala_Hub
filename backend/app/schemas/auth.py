import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.entities import UserRole

class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.student
    preferred_language: str = "en"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserRead(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    role: UserRole
    preferred_language: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
