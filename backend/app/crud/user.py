from __future__ import annotations

import uuid
from typing import Optional
from sqlmodel import Session, select
from app.models import User
from app.schemas.auth import UserRegister
from app.core.security import get_password_hash


def get_user_by_email(session: Session, email: str) -> Optional[User]:
    """
    Retrieve a user by their email address (case-insensitive).
    
    Args:
        session (Session): The active database transaction session.
        email (str): The email address to look up.
    Returns:
        Optional[User]: The matching user model instance, or None.
    """
    normalized_email = email.strip().lower()
    return session.exec(select(User).where(User.email == normalized_email)).first()

def get_user_by_id(session: Session, user_id: uuid.UUID) -> Optional[User]:
    """
    Retrieve a user by their UUID.
    
    Args:
        session (Session): The active database transaction session.
        user_id (UUID): The UUID of the user to fetch.
    Returns:
        Optional[User]: The user instance, or None if not found.
    """
    return session.get(User, user_id)

def create_user(session: Session, user_in: UserRegister, commit: bool = True) -> User:
    """
    Create a new user, hash their password, and save to the database.
    
    Args:
        session (Session): The active database transaction session.
        user_in (UserRegister): User registration data schema.
        commit (bool): If True, commits the transaction immediately.
    Returns:
        User: The newly created User model instance.
    """
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        full_name=user_in.full_name.strip(),
        email=user_in.email.strip().lower(),
        password_hash=hashed_password,
        role=user_in.role,
        preferred_language=user_in.preferred_language
    )
    session.add(new_user)
    if commit:
        session.commit()
        session.refresh(new_user)
    return new_user



