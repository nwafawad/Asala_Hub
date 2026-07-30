"""
Authentication API Routers.

Exposes endpoints for user registration, user login authentication,
and retrieving the currently logged-in user profile details.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session

from app.core.database import get_session
from app.core.exceptions import PermissionDeniedError
from app.models import User, UserRole
from app.models.base import get_naive_utc_now
from app.schemas.auth import UserRegister, TokenResponse, TokenRefreshRequest, UserRead, RoleSwitchRequest
from app.core.dependencies import get_current_user
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserRegister,
    response: Response,
    session: Session = Depends(get_session)
) -> TokenResponse:
    """
    Register a new user, hash their password, and issue a JWT access token via HttpOnly cookie and body.
    """
    return auth_service.register_new_user(session, user_in, response)


@router.post("/login", response_model=TokenResponse)
def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
) -> TokenResponse:
    """
    Authenticate credentials and generate a JWT access token via HttpOnly cookie and body.
    """
    return auth_service.authenticate_user(
        session=session,
        email=form_data.username,
        password=form_data.password,
        response=response,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(
    request: Request,
    response: Response,
    body: Optional[TokenRefreshRequest] = None,
    session: Session = Depends(get_session)
) -> TokenResponse:
    """
    Rotate and reissue access token (15 min) and refresh token (7 days) using a valid, non-revoked refresh token.
    Extracts refresh token from HttpOnly cookie or request body payload.
    """
    cookie_refresh = request.cookies.get("refresh_token")
    body_refresh = body.refresh_token if body and body.refresh_token else None
    raw_refresh = body_refresh or cookie_refresh

    return auth_service.refresh_tokens(
        session=session,
        raw_refresh_token=raw_refresh,
        response=response
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(
    request: Request,
    response: Response,
    body: Optional[TokenRefreshRequest] = None,
    session: Session = Depends(get_session)
) -> dict:
    """
    Revoke current refresh token session and clear HttpOnly authentication cookies.
    """
    cookie_refresh = request.cookies.get("refresh_token")
    body_refresh = body.refresh_token if body and body.refresh_token else None
    raw_refresh = body_refresh or cookie_refresh


    auth_service.logout_user(
        session=session,
        raw_refresh_token=raw_refresh,
        response=response
    )
    return {"status": "logged_out", "message": "Logged out successfully and cookies cleared."}


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Return the profile info of the currently logged-in user.
    """
    return current_user


@router.post("/switch-role", response_model=TokenResponse)
def switch_role(
    body: RoleSwitchRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
) -> TokenResponse:
    """
    Update the authenticated user's active role in the database
    and re-issue signed JWT access & refresh tokens containing the updated role claim.
    """
    if body.role == UserRole.admin and current_user.role != UserRole.admin:
        raise PermissionDeniedError("You do not have permission to switch to this role")

    current_user.role = body.role
    current_user.updated_at = get_naive_utc_now()
    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return auth_service._issue_tokens_and_session(session, current_user, response)

