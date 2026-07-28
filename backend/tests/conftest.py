"""
Pytest Global Configuration and Fixtures.

Provides an isolated in-memory SQLite database session fixture, TestClient instance,
and pre-authenticated user headers for student and educator test roles.
"""

import pytest
from typing import Generator
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from sqlmodel.pool import StaticPool

from app.main import app
from app.core.database import get_session
from app.models import User, UserRole
from app.core.security import get_password_hash, create_access_token


@pytest.fixture(name="session")
def session_fixture() -> Generator[Session, None, None]:
    """
    Creates an isolated in-memory SQLite database session for each test function.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session) -> Generator[TestClient, None, None]:
    """
    FastAPI TestClient fixture configured with in-memory database session override.
    """
    def get_session_override():
        yield session

    app.dependency_overrides[get_session] = get_session_override
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="test_educator")
def test_educator_fixture(session: Session) -> User:
    """
    Creates and returns a test educator user.
    """
    educator = User(
        full_name="Educator Test User",
        email="educator.test@asalahub.dev",
        password_hash=get_password_hash("TestPassword123"),
        role=UserRole.educator,
        preferred_language="en"
    )
    session.add(educator)
    session.commit()
    session.refresh(educator)
    return educator


@pytest.fixture(name="test_student")
def test_student_fixture(session: Session) -> User:
    """
    Creates and returns a test student user.
    """
    student = User(
        full_name="Student Test User",
        email="student.test@asalahub.dev",
        password_hash=get_password_hash("TestPassword123"),
        role=UserRole.student,
        preferred_language="en"
    )
    session.add(student)
    session.commit()
    session.refresh(student)
    return student


@pytest.fixture(name="educator_token_headers")
def educator_token_headers_fixture(test_educator: User) -> dict[str, str]:
    """
    Generates Authorization headers containing a valid JWT token for the test educator.
    """
    token = create_access_token(subject=test_educator.id, role=test_educator.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(name="student_token_headers")
def student_token_headers_fixture(test_student: User) -> dict[str, str]:
    """
    Generates Authorization headers containing a valid JWT token for the test student.
    """
    token = create_access_token(subject=test_student.id, role=test_student.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(name="test_admin")
def test_admin_fixture(session: Session) -> User:
    """
    Creates and returns a test admin user.
    """
    admin_user = User(
        full_name="Admin Test User",
        email="admin.test@asalahub.dev",
        password_hash=get_password_hash("TestPassword123"),
        role=UserRole.admin,
        preferred_language="en"
    )
    session.add(admin_user)
    session.commit()
    session.refresh(admin_user)
    return admin_user


@pytest.fixture(name="admin_token_headers")
def admin_token_headers_fixture(test_admin: User) -> dict[str, str]:
    """
    Generates Authorization headers containing a valid JWT token for the test admin.
    """
    token = create_access_token(subject=test_admin.id, role=test_admin.role)
    return {"Authorization": f"Bearer {token}"}

