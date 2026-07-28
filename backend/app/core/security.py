from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Union, Optional
from fastapi import Response
from jose import jwt
import bcrypt
from app.core.config import settings

# Precomputed dummy bcrypt hash (hashed "dummy_password" with 12 rounds) to mitigate timing attacks
DUMMY_HASH = "$2b$12$/hszLSxtjKS5P/ZByeR/t.YuIYIWLHEaVEcIChZCyrnKmcwuzZR/O"

def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """
    Verify a plain-text password against a hashed password using bcrypt.
    If hashed_password is None, performs a dummy verification to mitigate timing attacks.
    
    Returns:
        bool: True if password matches, False otherwise.
    """
    if hashed_password is None:
        bcrypt.checkpw(plain_password.encode("utf-8"), DUMMY_HASH.encode("utf-8"))
        return False
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        # Perform a dummy check on exceptions to maintain uniform timing
        bcrypt.checkpw(plain_password.encode("utf-8"), DUMMY_HASH.encode("utf-8"))
        return False


def get_password_hash(password: str) -> str:
    """
    Hash a plain-text password using bcrypt.
    
    Returns:
        str: The hashed password string.
    """
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def create_access_token(subject: Union[str, Any], role: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generate a signed JWT access token containing subject (user ID) and user role.
    
    Returns:
        str: Encoded JWT token string.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "sub": str(subject),
        "role": role
    }
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a signed JWT access token.
    """
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])

import hashlib
import secrets

def hash_refresh_token(token: str) -> str:
    """
    Compute SHA-256 hash of a refresh token for secure database storage.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_refresh_token_string() -> str:
    """
    Generate a secure, high-entropy raw refresh token string.
    """
    return secrets.token_urlsafe(48)


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """
    Helper function to set HttpOnly access_token and refresh_token cookies consistently.
    """
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.effective_cookie_secure,
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.effective_cookie_secure,
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )


def set_auth_cookie(response: Response, token: str) -> None:
    """
    Legacy helper function to set access_token cookie.
    """
    set_auth_cookies(response, access_token=token, refresh_token="")


def clear_auth_cookies(response: Response) -> None:
    """
    Helper function to delete both access_token and refresh_token cookies upon logout.
    """
    response.delete_cookie(
        key="access_token",
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.effective_cookie_secure
    )
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        samesite=settings.COOKIE_SAMESITE,
        secure=settings.effective_cookie_secure
    )


def clear_auth_cookie(response: Response) -> None:
    """
    Legacy helper to delete authentication cookie.
    """
    clear_auth_cookies(response)





