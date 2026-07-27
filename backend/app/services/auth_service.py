"""
Authentication Service.

Encapsulates business workflows for user registration, credentials authentication,
and JWT token/cookie issuance.
"""

from fastapi import Response
from sqlmodel import Session

from app.core.exceptions import ResourceConflictError, AuthenticationError
from app.core.security import verify_password, create_access_token, set_auth_cookie
from app.schemas.auth import UserRegister, TokenResponse
from app.crud import user as crud_user


def register_new_user(
    session: Session,
    user_in: UserRegister,
    response: Response
) -> TokenResponse:
    """
    Business workflow for registering a new user.
    Verifies email uniqueness, creates user record, and issues authentication cookie + token.
    """
    existing_user = crud_user.get_user_by_email(session, user_in.email)
    if existing_user:
        raise ResourceConflictError("A user with this email address already exists.")

    new_user = crud_user.create_user(session, user_in)
    access_token = create_access_token(subject=new_user.id, role=new_user.role)
    set_auth_cookie(response, access_token)
    return TokenResponse(access_token=access_token, token_type="bearer")


def authenticate_user(
    session: Session,
    email: str,
    password: str,
    response: Response
) -> TokenResponse:
    """
    Business workflow for user login authentication.
    Verifies user credentials with uniform timing protection, issues authentication cookie + token.
    """
    user = crud_user.get_user_by_email(session, email)
    user_hash = user.password_hash if user else None

    # Always verify password to mitigate timing attacks on non-existent users
    password_correct = verify_password(password, user_hash)

    if not user or not password_correct:
        raise AuthenticationError("Incorrect email or password")

    access_token = create_access_token(subject=user.id, role=user.role)
    set_auth_cookie(response, access_token)
    return TokenResponse(access_token=access_token, token_type="bearer")
