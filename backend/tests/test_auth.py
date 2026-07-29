"""
Authentication Endpoints Test Suite.

Tests registration, credentials authentication, refresh token issuance & rotation,
logout revocation, expired access token 401 handling, user profile retrieval (/auth/me),
and online role switching (/auth/switch-role).
"""

from datetime import timedelta
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.security import create_access_token


def test_register_user_success(client: TestClient):
    """Test registering a new user with valid details issuing both access and refresh tokens."""
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
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies


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
    """Test logging in with valid credentials issuing access and refresh tokens."""
    response = client.post(
        "/auth/login",
        data={"username": test_educator.email, "password": "TestPassword123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert "access_token" in response.cookies
    assert "refresh_token" in response.cookies


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


def test_token_refresh_rotation_flow(client: TestClient, test_educator):
    """Test rotating access/refresh tokens via POST /auth/refresh and verifying old refresh token is revoked."""
    login_res = client.post(
        "/auth/login",
        data={"username": test_educator.email, "password": "TestPassword123"}
    )
    assert login_res.status_code == 200
    old_refresh_token = login_res.json()["refresh_token"]

    # 1. Refresh tokens using valid refresh token
    refresh_res = client.post(
        "/auth/refresh",
        json={"refresh_token": old_refresh_token}
    )
    assert refresh_res.status_code == 200
    new_data = refresh_res.json()
    assert "access_token" in new_data
    assert "refresh_token" in new_data
    assert new_data["refresh_token"] != old_refresh_token

    # 2. Attempting to reuse old rotated refresh token -> 401 Unauthorized
    reuse_res = client.post(
        "/auth/refresh",
        json={"refresh_token": old_refresh_token}
    )
    assert reuse_res.status_code == 401
    assert reuse_res.json()["detail"] == "Invalid, expired, or revoked refresh token"


def test_logout_revokes_refresh_token(client: TestClient, test_educator):
    """Test logging out revokes refresh token and clears authentication cookies."""
    login_res = client.post(
        "/auth/login",
        data={"username": test_educator.email, "password": "TestPassword123"}
    )
    refresh_token = login_res.json()["refresh_token"]

    logout_res = client.post(
        "/auth/logout",
        json={"refresh_token": refresh_token}
    )
    assert logout_res.status_code == 200
    assert logout_res.json()["status"] == "logged_out"

    # Attempting to refresh with logged-out token -> 401
    refresh_res = client.post(
        "/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert refresh_res.status_code == 401


def test_expired_access_token_handling(client: TestClient, test_student):
    """Test that an expired JWT access token is rejected gracefully with HTTP 401 'Token has expired'."""
    expired_token = create_access_token(
        subject=test_student.id,
        role=test_student.role,
        expires_delta=timedelta(minutes=-5)
    )

    res = client.get("/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401
    assert res.json()["detail"] == "Token has expired"


def test_switch_role_success(client: TestClient, test_student, student_token_headers):
    """Test switching user role via POST /auth/switch-role re-issues token with new role claim."""
    res = client.post("/auth/switch-role", json={"role": "educator"}, headers=student_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data

    # Verify updated profile via /auth/me
    new_headers = {"Authorization": f"Bearer {data['access_token']}"}
    me_res = client.get("/auth/me", headers=new_headers)
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "educator"
