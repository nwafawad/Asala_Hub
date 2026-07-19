import uuid
from typing import Optional
from sqlmodel import Session, select
from app.models import User
from app.schemas.auth import UserRegister
from app.core.security import get_password_hash

def get_user_by_email(session: Session, email: str) -> Optional[User]:
    """Retrieve a user by their email address."""
    return session.exec(select(User).where(User.email == email)).first()

def get_user_by_id(session: Session, user_id: uuid.UUID) -> Optional[User]:
    """Retrieve a user by their UUID."""
    return session.get(User, user_id)

def create_user(session: Session, user_in: UserRegister) -> User:
    """Create a new user, hash their password, and save to the database."""
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        full_name=user_in.full_name,
        email=user_in.email,
        password_hash=hashed_password,
        role=user_in.role,
        preferred_language=user_in.preferred_language
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user
