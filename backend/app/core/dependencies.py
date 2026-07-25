from __future__ import annotations

import uuid
from typing import List, Union, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlmodel import Session
from app.core.database import get_session
from app.core.security import decode_access_token
from app.models import User, UserRole
from app.schemas.auth import UserAuthClaims

# Configures OAuth2 authentication flow pointing to login endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def get_token_from_request(
    request: Request,
    header_token: Optional[str] = Depends(oauth2_scheme)
) -> str:
    """
    Extract JWT token from HttpOnly cookie or Authorization header.
    """
    cookie_token = request.cookies.get("access_token")
    token = cookie_token or header_token
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token

def get_current_user_claims(
    token: str = Depends(get_token_from_request)
) -> UserAuthClaims:
    """
    FastAPI dependency to extract JWT claims without forcing a database query.
    
    Raises:
        HTTPException: 401 Unauthorized if the token is invalid.
    Returns:
        UserAuthClaims: Struct containing user_id and role claims.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        role = payload.get("role")
        if user_id is None or role is None:
            raise credentials_exception
        return UserAuthClaims(user_id=uuid.UUID(str(user_id)), role=UserRole(role))
    except (JWTError, ValueError):
        raise credentials_exception

def get_current_user(
    token: str = Depends(get_token_from_request),
    session: Session = Depends(get_session)
) -> User:
    """
    FastAPI dependency to extract and authenticate the current user using a JWT bearer token.
    
    Raises:
        HTTPException: 401 Unauthorized if the token is invalid or the user is not found.
    Returns:
        User: The authenticated User database model.
    """
    claims = get_current_user_claims(token)
    user = session.get(User, claims.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

class RoleChecker:
    """
    Callable dependency to check if the authenticated user matches one of the allowed roles.
    """
    def __init__(self, allowed_roles: List[UserRole]):
        """
        Initialize the RoleChecker with a list of permitted roles.
        """
        self.allowed_roles = allowed_roles

    def __call__(
        self,
        current_user: Union[User, UserAuthClaims] = Depends(get_current_user_claims)
    ) -> Union[User, UserAuthClaims]:
        """
        Enforce the role restrictions against the currently logged-in user.
        
        Raises:
            HTTPException: 403 Forbidden if the user's role is not allowed.
        """
        user_role = getattr(current_user, "role", None)
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action"
            )
        return current_user

def require_role(*roles: UserRole):
    """
    Factory helper to enforce endpoint RBAC (Role-Based Access Control) policies.
    
    Usage:
        `Depends(require_role(UserRole.educator))`
    """
    return RoleChecker(list(roles))



