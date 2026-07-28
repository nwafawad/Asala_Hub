"""
Core FastAPI Dependencies.

Provides authentication claim parsing, role-based access control (RBAC),
and reusable resource verification dependencies.
"""

from __future__ import annotations

import uuid
from typing import List, Union, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlmodel import Session

from app.core.database import get_session
from app.core.security import decode_access_token
from app.core.exceptions import (
    AuthenticationError,
    PermissionDeniedError,
    ResourceNotFoundError,
)
from app.models import User, UserRole, Course, Module, Assignment
from app.schemas.auth import UserAuthClaims
import app.crud.courses as crud_courses
import app.crud.modules as crud_modules
import app.crud.assignments as crud_assignments

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
        raise AuthenticationError("Could not validate credentials")
    return token


from jose import ExpiredSignatureError, JWTError


def get_current_user_claims(
    token: str = Depends(get_token_from_request)
) -> UserAuthClaims:
    """
    FastAPI dependency to extract JWT claims without forcing a database query.
    
    Raises:
        AuthenticationError: If token signature or claims are invalid or token is expired.
    Returns:
        UserAuthClaims: Struct containing user_id and role claims.
    """
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        role = payload.get("role")
        if user_id is None or role is None:
            raise AuthenticationError("Could not validate credentials")
        return UserAuthClaims(user_id=uuid.UUID(str(user_id)), role=UserRole(role))
    except ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except (JWTError, ValueError):
        raise AuthenticationError("Could not validate credentials")



def get_current_user(
    claims: UserAuthClaims = Depends(get_current_user_claims),
    session: Session = Depends(get_session)
) -> User:
    """
    FastAPI dependency to extract and authenticate the current user using a JWT bearer token.
    
    Raises:
        AuthenticationError: If user is not found in the database.
    Returns:
        User: The authenticated User database model.
    """
    user = session.get(User, claims.user_id)
    if user is None:
        raise AuthenticationError("Could not validate credentials")
    return user


class RoleChecker:
    """
    Callable dependency to check if the authenticated user matches one of the allowed roles.
    """
    def __init__(self, allowed_roles: List[UserRole]):
        """
        Initialize the RoleChecker with a list of permitted roles.
        """
        self.allowed_roles = set(allowed_roles)

    def __call__(
        self,
        current_user: Union[User, UserAuthClaims] = Depends(get_current_user_claims)
    ) -> Union[User, UserAuthClaims]:
        """
        Enforce the role restrictions against the currently logged-in user.
        
        Raises:
            PermissionDeniedError: 403 Forbidden if the user's role is not allowed.
        """
        user_role = getattr(current_user, "role", None)
        if user_role not in self.allowed_roles:
            raise PermissionDeniedError("You do not have permission to perform this action")
        return current_user


def require_role(*roles: UserRole):
    """
    Factory helper to enforce endpoint RBAC (Role-Based Access Control) policies.
    
    Usage:
        `Depends(require_role(UserRole.educator))`
    """
    return RoleChecker(list(roles))


def require_admin(current_user: User = Depends(require_role(UserRole.admin))) -> User:
    """
    Dependency helper to enforce that the authenticated user has the Admin role.
    """
    return current_user



# Resource Verification Dependencies

def get_valid_course(
    course_id: uuid.UUID,
    session: Session = Depends(get_session)
) -> Course:
    """
    Fetch course by ID or raise ResourceNotFoundError.
    """
    course = crud_courses.get_course_by_id(session, course_id)
    if not course:
        raise ResourceNotFoundError("Course", course_id)
    return course


def get_valid_course_for_educator(
    course_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.educator)),
    session: Session = Depends(get_session)
) -> Course:
    """
    Fetch course by ID and verify the currently authenticated educator is the owner.
    """
    course = get_valid_course(course_id, session)
    if course.educator_id != current_user.id:
        raise PermissionDeniedError("You do not have permission to modify this course")
    return course
