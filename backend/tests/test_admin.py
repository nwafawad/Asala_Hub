"""
Admin & Conflict Resolution Test Suite.

Tests RBAC access controls (ensuring non-admins get 403), system health aggregation,
and end-to-end conflict resolution workflows.
"""

import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Course, Assignment, Submission, SyncStatus, UserRole


def test_admin_rbac_protection(
    client: TestClient, student_token_headers, educator_token_headers
):
    """Verify that unauthenticated, student, and educator users receive HTTP 403/401 on admin routes."""
    # Unauthenticated
    res1 = client.get("/admin/health")
    assert res1.status_code == 401

    res2 = client.get("/admin/conflicts")
    assert res2.status_code == 401

    # Student user
    res3 = client.get("/admin/health", headers=student_token_headers)
    assert res3.status_code == 403
    assert res3.json()["detail"] == "You do not have permission to perform this action"

    res4 = client.get("/admin/conflicts", headers=student_token_headers)
    assert res4.status_code == 403

    # Educator user
    res5 = client.get("/admin/health", headers=educator_token_headers)
    assert res5.status_code == 403

    res6 = client.get("/admin/conflicts", headers=educator_token_headers)
    assert res6.status_code == 403

    dummy_id = str(uuid.uuid4())
    res7 = client.post(
        f"/admin/conflicts/{dummy_id}/resolve",
        json={"strategy": "keep_server"},
        headers=educator_token_headers
    )
    assert res7.status_code == 403


def test_admin_get_health(client: TestClient, admin_token_headers):
    """Verify that admin user can successfully fetch system health metrics."""
    res = client.get("/admin/health", headers=admin_token_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
    assert "total_transaction_logs" in data
    assert "unresolved_conflicts" in data
    assert "max_server_sequence" in data
    assert "users_count" in data
    assert "admin" in data["users_count"]


def test_admin_conflict_resolution_flow(
    client: TestClient,
    session: Session,
    test_educator,
    test_student,
    test_admin,
    admin_token_headers
):
    """Test full conflict listing and resolution flow by an admin user."""
    # 1. Setup course, assignment, and a conflicting submission
    course = Course(
        title="Admin Conflict Course",
        description="Testing admin conflict resolution",
        educator_id=test_educator.id
    )
    session.add(course)
    session.commit()
    session.refresh(course)

    assignment = Assignment(
        title="Conflict Assignment",
        description="Assignment with conflict",
        due_date=datetime.now(timezone.utc).replace(tzinfo=None),
        course_id=course.id
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)

    submission = Submission(
        assignment_id=assignment.id,
        student_id=test_student.id,
        content="Conflicting client content v1",
        submitted_at=datetime.now(timezone.utc).replace(tzinfo=None),
        sync_status=SyncStatus.conflict,
        version=1
    )
    session.add(submission)
    session.commit()
    session.refresh(submission)

    # 2. Admin lists unresolved conflicts
    list_res = client.get("/admin/conflicts", headers=admin_token_headers)
    assert list_res.status_code == 200
    conflicts = list_res.json()
    assert len(conflicts) == 1
    assert conflicts[0]["id"] == str(submission.id)
    assert conflicts[0]["sync_status"] == "conflict"
    assert conflicts[0]["resolution_status"] is None
    assert conflicts[0]["assignment_title"] == "Conflict Assignment"
    assert conflicts[0]["student_name"] == test_student.full_name

    # 3. Admin resolves conflict manually with strategy "manual_merge"
    resolve_res = client.post(
        f"/admin/conflicts/{submission.id}/resolve",
        json={
            "strategy": "manual_merge",
            "content": "Merged final content resolved by admin",
            "grade": 95.0,
            "resolution_note": "Resolved client-server edit overlap manually."
        },
        headers=admin_token_headers
    )
    assert resolve_res.status_code == 200
    resolved_data = resolve_res.json()
    assert resolved_data["sync_status"] == "synced"
    assert resolved_data["resolution_status"] == "resolved"
    assert resolved_data["content"] == "Merged final content resolved by admin"
    assert resolved_data["grade"] == 95.0
    assert resolved_data["resolved_by"] == str(test_admin.id)
    assert resolved_data["resolution_note"] == "Resolved client-server edit overlap manually."

    # 4. Verify listing now returns 0 unresolved conflicts
    list_res_after = client.get("/admin/conflicts", headers=admin_token_headers)
    assert list_res_after.status_code == 200
    assert len(list_res_after.json()) == 0

    # 5. Check health metric reflects 0 unresolved conflicts
    health_res = client.get("/admin/health", headers=admin_token_headers)
    assert health_res.status_code == 200
    assert health_res.json()["unresolved_conflicts"] == 0

    # 6. Attempting to resolve an already-resolved submission returns 400 Bad Request
    re_resolve_res = client.post(
        f"/admin/conflicts/{submission.id}/resolve",
        json={"strategy": "keep_server"},
        headers=admin_token_headers
    )
    assert re_resolve_res.status_code == 400
    assert "not in an unresolved conflict state" in re_resolve_res.json()["detail"]

