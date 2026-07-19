"""
Dependencies Module.

Provides common dependencies injected into FastAPI route handlers,
including OAuth2 bearer token authentication and Role-Based Access Control (RBAC).
"""

from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlmodel import Session
from app.core.config import settings
from app.core.database import get_session
from app.models import User, UserRole

# Configures OAuth2 authentication flow pointing to login endpoint
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session)
) -> User:
    """
    FastAPI dependency to extract and authenticate the current user using a JWT bearer token.
    
    Raises:
        HTTPException: 401 Unauthorized if the token is invalid or the user is not found.
    Returns:
        User: The authenticated User database model.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode JWT token claims
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Query database for user instance
    user = session.get(User, user_id)
    if user is None:
        raise credentials_exception
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

    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        """
        Enforce the role restrictions against the currently logged-in user.
        
        Raises:
            HTTPException: 403 Forbidden if the user's role is not allowed.
        """
        if current_user.role not in self.allowed_roles:
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

