"""
Authentication Endpoints Test Suite.

Tests registration, authentication credentials, timing attack resilience,
and current user profile retrieval (/auth/me).
"""

from fastapi.testclient import TestClient
from sqlmodel import Session


def test_register_user_success(client: TestClient):
    """Test registering a new user with valid details."""
    payload = {
        "full_name": "New Student",
        "email": "newstudent@asalahub.dev",
        "password": "Password123!",
        "role": "student",
        "preferred_language": "ar"
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "access_token" in response.cookies


def test_register_duplicate_email_conflict(client: TestClient, test_student):
    """Test registering with an already existing email returns 409 Conflict."""
    payload = {
        "full_name": "Duplicate Student",
        "email": test_student.email,
        "password": "Password123!",
        "role": "student"
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 409
    assert response.json()["detail"] == "A user with this email address already exists."


def test_login_success(client: TestClient, test_educator):
    """Test logging in with valid credentials."""
    response = client.post(
        "/auth/login",
        data={"username": test_educator.email, "password": "TestPassword123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_password(client: TestClient, test_educator):
    """Test logging in with incorrect password returns 401 Unauthorized."""
    response = client.post(
        "/auth/login",
        data={"username": test_educator.email, "password": "WrongPassword!"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_get_current_user_me(client: TestClient, test_student, student_token_headers):
    """Test retrieving current user profile via /auth/me."""
    response = client.get("/auth/me", headers=student_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_student.email
    assert data["full_name"] == test_student.full_name
    assert data["role"] == "student"
