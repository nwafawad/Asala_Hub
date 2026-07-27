"""
Authentication API Routers.

Exposes endpoints for user registration, user login authentication,
and retrieving the currently logged-in user profile details.
"""

from fastapi import APIRouter, Depends, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session

from app.core.database import get_session
from app.models import User
from app.schemas.auth import UserRegister, TokenResponse, UserRead
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


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Return the profile info of the currently logged-in user.
    """
    return current_user
