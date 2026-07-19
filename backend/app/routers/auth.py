"""
Authentication API Routers.

Exposes endpoints for user registration, user login authentication,
and retrieving the currently logged-in user profile details.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session
from app.core.database import get_session
from app.models import User
from app.schemas.auth import UserRegister, TokenResponse, UserRead
from app.core.security import verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.crud import user as crud_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserRegister,
    session: Session = Depends(get_session)
):
    """
    Register a new user, hash their password, and issue a JWT access token.
    
    Raises:
        HTTPException: 409 Conflict if email is already registered.
    """
    # Verify uniqueness of the email address
    existing_user = crud_user.get_user_by_email(session, user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists."
        )
    
    # Store the user entity and generate a session token
    new_user = crud_user.create_user(session, user_in)
    access_token = create_access_token(subject=new_user.id, role=new_user.role)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session)
):
    """
    Authenticate credentials and generate a JWT access token.
    
    Raises:
        HTTPException: 401 Unauthorized if email or password does not match.
    """
    # OAuth2 request form passes email via the 'username' form field
    user = crud_user.get_user_by_email(session, form_data.username)
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Generate and return user session access token
    access_token = create_access_token(subject=user.id, role=user.role)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)):
    """
    Return the profile info of the currently logged-in user.
    """
    return current_user

