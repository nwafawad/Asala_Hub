"""
Tests for Admin User Management & Audit Log API Endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.user import User, UserRole, AccountStatus
from app.models.audit import AdminAuditEvent, AdminActionType


def test_admin_user_directory_listing(client: TestClient, admin_token_headers: dict, session: Session):
    """Test listing user directory as admin with pagination and search."""
    response = client.get("/admin/users", headers=admin_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any("email" in u for u in data)


def test_admin_user_detail_fetch(client: TestClient, admin_token_headers: dict, test_student: User):
    """Test fetching detailed user profile for account drawer."""
    response = client.get(f"/admin/users/{test_student.id}", headers=admin_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_student.id)
    assert data["email"] == test_student.email
    assert "courses" in data
    assert "recent_submissions" in data


def test_admin_password_reset_flow(client: TestClient, admin_token_headers: dict, test_student: User, session: Session):
    """Test administrative password reset and audit log generation."""
    payload = {"mode": "generate"}
    response = client.post(f"/admin/users/{test_student.id}/reset-password", json=payload, headers=admin_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["temporary_password"] is not None

    # Verify user state updated
    session.refresh(test_student)
    assert test_student.must_change_password is True

    # Verify audit event generated
    audit_events = session.exec(
        select(AdminAuditEvent).where(AdminAuditEvent.target_user_id == test_student.id)
    ).all()
    assert len(audit_events) >= 1
    assert audit_events[0].action_type == AdminActionType.password_reset


def test_admin_suspend_and_reactivate_flow(client: TestClient, admin_token_headers: dict, test_student: User, session: Session):
    """Test suspending and reactivating an account."""
    # Suspend
    suspend_res = client.post(f"/admin/users/{test_student.id}/suspend", headers=admin_token_headers)
    assert suspend_res.status_code == 200
    assert suspend_res.json()["success"] is True

    session.refresh(test_student)
    assert test_student.status == AccountStatus.suspended

    # Verify suspended login blocked with 403
    login_res = client.post(
        "/auth/login",
        data={"username": test_student.email, "password": "TestPassword123"}
    )
    assert login_res.status_code == 403
    assert "suspended" in login_res.json()["detail"].lower()

    # Reactivate
    react_res = client.post(f"/admin/users/{test_student.id}/reactivate", headers=admin_token_headers)
    assert react_res.status_code == 200
    assert react_res.json()["status"] == "active"

    session.refresh(test_student)
    assert test_student.status == AccountStatus.active


def test_admin_dashboard_stats(client: TestClient, admin_token_headers: dict):
    """Test fetching aggregated admin dashboard metrics."""
    response = client.get("/admin/dashboard-stats", headers=admin_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_students" in data
    assert "total_educators" in data
    assert "active_accounts" in data
    assert "suspended_accounts" in data
    assert "recent_audit_events" in data


def test_admin_create_user_flow(client: TestClient, admin_token_headers: dict, session: Session):
    """Test direct user provisioning by admin with audit logging and password constraints."""
    payload = {
        "full_name": "Tariq Aziz",
        "email": "tariq.aziz@asala.edu",
        "role": "student",
        "mode": "generate"
    }
    response = client.post("/admin/users", json=payload, headers=admin_token_headers)
    assert response.status_code == 201
    data = response.json()

    assert data["user"]["full_name"] == "Tariq Aziz"
    assert data["user"]["email"] == "tariq.aziz@asala.edu"
    assert data["user"]["role"] == "student"
    assert data["user"]["must_change_password"] is True
    assert len(data["temporary_password"]) > 6

    # Verify duplicate email conflict error
    dup_res = client.post("/admin/users", json=payload, headers=admin_token_headers)
    assert dup_res.status_code == 409

    # Verify audit event recorded
    new_user = session.exec(select(User).where(User.email == "tariq.aziz@asala.edu")).first()
    assert new_user is not None
    audit_event = session.exec(select(AdminAuditEvent).where(AdminAuditEvent.target_user_id == new_user.id)).first()
    assert audit_event is not None
    assert audit_event.action_type == AdminActionType.account_created


def test_admin_bulk_import_user_flow(client: TestClient, admin_token_headers: dict, session: Session):
    """Test bulk CSV account import processing, duplicate handling, and summary report."""
    csv_content = (
        "full_name,email,role\n"
        "Bilal Qasim,bilal.qasim@asala.edu,student\n"
        "Nora Saeed,nora.saeed@asala.edu,educator\n"
        "Bilal Qasim,bilal.qasim@asala.edu,student\n"
    )

    files = {"file": ("roster.csv", csv_content.encode("utf-8"), "text/csv")}
    response = client.post("/admin/users/bulk-import", files=files, headers=admin_token_headers)

    assert response.status_code == 200
    data = response.json()

    assert data["total_rows"] == 3
    assert data["success_count"] == 2
    assert data["skipped_count"] == 1
    assert len(data["created_users"]) == 2
    assert len(data["errors"]) == 1
    assert "already exists" in data["errors"][0]["reason"]

    # Verify created users in DB
    user_bilal = session.exec(select(User).where(User.email == "bilal.qasim@asala.edu")).first()
    assert user_bilal is not None
    assert user_bilal.role == UserRole.student
    assert user_bilal.must_change_password is True

