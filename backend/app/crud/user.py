from __future__ import annotations

import uuid
from typing import List, Optional
from sqlmodel import Session, select, func, or_, col
from app.models import User
from app.models.user import UserRole
from app.models.base import get_naive_utc_now
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
    return session.exec(select(User).where(func.lower(User.email) == normalized_email)).first()

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


def get_users(
    session: Session,
    skip: int = 0,
    limit: int = 100,
    role: Optional[UserRole] = None
) -> List[User]:
    """
    Retrieve users with optional role filtering and pagination.
    """
    query = select(User).order_by(col(User.created_at).desc())
    if role is not None:
        query = query.where(col(User.role) == role)
    return list(session.exec(query.offset(skip).limit(limit)).all())


def search_users(
    session: Session,
    search_term: str,
    skip: int = 0,
    limit: int = 100,
    role: Optional[UserRole] = None
) -> List[User]:
    """
    Search users by name or email (case-insensitive).
    """
    clean_term = search_term.strip().replace("%", r"\%").replace("_", r"\_")
    pattern = f"%{clean_term}%"
    query = select(User).where(
        or_(
            col(User.full_name).ilike(pattern),
            col(User.email).ilike(pattern)
        )
    ).order_by(col(User.created_at).desc())

    if role is not None:
        query = query.where(col(User.role) == role)
    return list(session.exec(query.offset(skip).limit(limit)).all())


def count_users(session: Session, role: Optional[UserRole] = None) -> int:
    """
    Count total registered users efficiently.
    """
    query = select(func.count(col(User.id)))
    if role is not None:
        query = query.where(col(User.role) == role)
    return session.exec(query).first() or 0


def update_user_profile(
    session: Session,
    db_user: User,
    full_name: Optional[str] = None,
    preferred_language: Optional[str] = None,
    commit: bool = True
) -> User:
    """
    Update a user's profile attributes and refresh updated_at.
    """
    if full_name is not None and full_name.strip():
        db_user.full_name = full_name.strip()
    if preferred_language is not None and preferred_language.strip():
        db_user.preferred_language = preferred_language.strip()
    db_user.updated_at = get_naive_utc_now()
    session.add(db_user)
    if commit:
        session.commit()
        session.refresh(db_user)
    return db_user


def update_user_password(
    session: Session, db_user: User, new_password: str, commit: bool = True
) -> User:
    """
    Update a user's password securely with bcrypt hashing.
    """
    db_user.password_hash = get_password_hash(new_password)
    db_user.updated_at = get_naive_utc_now()
    session.add(db_user)
    if commit:
        session.commit()
        session.refresh(db_user)
    return db_user


def delete_user(session: Session, db_user: User, commit: bool = True) -> None:
    """
    Delete a user record from the database.
    """
    session.delete(db_user)
    if commit:
        session.commit()
