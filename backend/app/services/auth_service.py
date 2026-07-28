"""
Authentication Service.

Encapsulates business workflows for user registration, credentials authentication,
JWT access token & long-lived refresh token issuance, token rotation, and logout session revocation.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Response
from sqlmodel import Session, select

from app.core.config import settings
from app.core.exceptions import ResourceConflictError, AuthenticationError
from app.core.security import (
    verify_password,
    create_access_token,
    generate_refresh_token_string,
    hash_refresh_token,
    set_auth_cookies,
    clear_auth_cookies,
)
from app.models import User, RefreshToken
from app.models.base import get_naive_utc_now
from app.schemas.auth import UserRegister, TokenResponse
from app.crud import user as crud_user

logger = logging.getLogger("asala_hub.auth")


def _issue_tokens_and_session(
    session: Session, user: User, response: Response
) -> TokenResponse:
    """
    Internal helper to generate a short-lived access token and a long-lived refresh token,
    record the hashed refresh token session in the database, set HttpOnly cookies, and return TokenResponse.
    """
    access_token = create_access_token(subject=user.id, role=user.role)
    raw_refresh_token = generate_refresh_token_string()
    token_hash = hash_refresh_token(raw_refresh_token)
    expires_at = get_naive_utc_now() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)

    db_refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
        is_revoked=False,
    )
    session.add(db_refresh_token)
    session.commit()

    set_auth_cookies(response, access_token=access_token, refresh_token=raw_refresh_token)
    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        token_type="bearer"
    )


def register_new_user(
    session: Session,
    user_in: UserRegister,
    response: Response
) -> TokenResponse:
    """
    Business workflow for registering a new user.
    Verifies email uniqueness, creates user record, and issues access/refresh tokens.
    """
    existing_user = crud_user.get_user_by_email(session, user_in.email)
    if existing_user:
        raise ResourceConflictError("A user with this email address already exists.")

    new_user = crud_user.create_user(session, user_in)
    return _issue_tokens_and_session(session, new_user, response)


def authenticate_user(
    session: Session,
    email: str,
    password: str,
    response: Response
) -> TokenResponse:
    """
    Business workflow for user login authentication.
    Verifies user credentials with uniform timing protection, issues access/refresh tokens.
    """
    user = crud_user.get_user_by_email(session, email)
    user_hash = user.password_hash if user else None

    # Always verify password to mitigate timing attacks on non-existent users
    password_correct = verify_password(password, user_hash)

    if not user or not password_correct:
        raise AuthenticationError("Incorrect email or password")

    return _issue_tokens_and_session(session, user, response)


def refresh_tokens(
    session: Session,
    raw_refresh_token: str,
    response: Response
) -> TokenResponse:
    """
    Rotate and reissue access/refresh tokens using a valid, non-revoked refresh token.
    Revokes the old refresh token upon rotation per token rotation security best practices.
    """
    if not raw_refresh_token:
        clear_auth_cookies(response)
        raise AuthenticationError("Refresh token missing")

    token_hash = hash_refresh_token(raw_refresh_token)
    statement = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    db_token = session.exec(statement).first()

    now = get_naive_utc_now()
    if not db_token or db_token.is_revoked or db_token.expires_at < now:
        clear_auth_cookies(response)
        if db_token and db_token.is_revoked:
            logger.warning(f"Security Alert: Revoked refresh token reused for user {db_token.user_id}")
        raise AuthenticationError("Invalid, expired, or revoked refresh token")

    user = session.get(User, db_token.user_id)
    if not user:
        clear_auth_cookies(response)
        raise AuthenticationError("User account associated with refresh token is invalid")


    # Revoke old refresh token (Token Rotation)
    db_token.is_revoked = True
    session.add(db_token)
    session.commit()

    # Issue new token pair
    return _issue_tokens_and_session(session, user, response)


def logout_user(
    session: Session,
    raw_refresh_token: Optional[str],
    response: Response
) -> None:
    """
    Revoke current refresh token session and clear HttpOnly authentication cookies.
    """
    if raw_refresh_token:
        token_hash = hash_refresh_token(raw_refresh_token)
        statement = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        db_token = session.exec(statement).first()
        if db_token and not db_token.is_revoked:
            db_token.is_revoked = True
            session.add(db_token)
            session.commit()

    clear_auth_cookies(response)
