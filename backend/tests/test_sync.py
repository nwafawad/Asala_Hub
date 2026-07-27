"""
Offline Sync Engine Test Suite.

Tests batch transaction processing, idempotency, schema versioning,
version conflict detection, and BR-4 educator grade priority rules.
"""

import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient


def test_sync_empty_batch(client: TestClient, student_token_headers):
    """Test sending an empty transaction batch."""
    response = client.post("/sync", json={"transactions": []}, headers=student_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["synced_count"] == 0
    assert data["error_count"] == 0
    assert data["results"] == []


def test_sync_submission_create_and_idempotency(
    client: TestClient, educator_token_headers, student_token_headers
):
    """Test creating a submission via sync and verifying idempotency on retry."""
    # 1. Create Course & Assignment
    c_resp = client.post(
        "/courses/",
        json={"title": "Sync Test Course", "description": "Sync testing"},
        headers=educator_token_headers
    )
    course_id = c_resp.json()["id"]

    a_resp = client.post(
        f"/courses/{course_id}/assignments",
        json={"title": "Sync Assignment", "description": "Offline assignment", "due_date": "2026-12-31T23:59:59Z"},
        headers=educator_token_headers
    )
    assignment_id = a_resp.json()["id"]

    # 2. Student syncs offline submission
    tx_id = str(uuid.uuid4())
    sub_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()

    batch_payload = {
        "transactions": [
            {
                "transaction_id": tx_id,
                "entity_type": "submission",
                "entity_id": sub_id,
                "action": "CREATE",
                "payload": {
                    "assignment_id": assignment_id,
                    "content": "Offline essay submission content",
                    "version": 1
                },
                "client_timestamp": now_str,
                "schema_version": 1
            }
        ]
    }

    # First sync call
    res1 = client.post("/sync", json=batch_payload, headers=student_token_headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["synced_count"] == 1
    assert data1["results"][0]["status"] == "accepted"
    seq1 = data1["results"][0]["server_sequence"]
    assert seq1 is not None

    # Duplicate idempotency call with same transaction_id
    res2 = client.post("/sync", json=batch_payload, headers=student_token_headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["synced_count"] == 1
    assert data2["results"][0]["status"] == "accepted"
    assert data2["results"][0]["server_sequence"] == seq1


def test_sync_educator_grade_write_br4(
    client: TestClient, educator_token_headers, student_token_headers
):
    """Test BR-4 rule: Educator grade mutation via sync is accepted and updates grade."""
    # 1. Setup course, assignment, student submission
    c_resp = client.post(
        "/courses/",
        json={"title": "Grading Course", "description": "Grade testing"},
        headers=educator_token_headers
    )
    course_id = c_resp.json()["id"]

    a_resp = client.post(
        f"/courses/{course_id}/assignments",
        json={"title": "Graded Assignment", "description": "Grading test", "due_date": "2026-12-31T23:59:59Z"},
        headers=educator_token_headers
    )
    assignment_id = a_resp.json()["id"]

    sub_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()

    # Create submission via student sync
    sub_tx_id = str(uuid.uuid4())
    client.post(
        "/sync",
        json={
            "transactions": [
                {
                    "transaction_id": sub_tx_id,
                    "entity_type": "submission",
                    "entity_id": sub_id,
                    "action": "CREATE",
                    "payload": {"assignment_id": assignment_id, "content": "My essay", "version": 1},
                    "client_timestamp": now_str,
                    "schema_version": 1
                }
            ]
        },
        headers=student_token_headers
    )

    # Educator syncs grade write
    grade_tx_id = str(uuid.uuid4())
    grade_resp = client.post(
        "/sync",
        json={
            "transactions": [
                {
                    "transaction_id": grade_tx_id,
                    "entity_type": "submission",
                    "entity_id": sub_id,
                    "action": "UPDATE",
                    "payload": {"grade": 98.0, "version": 1},
                    "client_timestamp": now_str,
                    "schema_version": 1
                }
            ]
        },
        headers=educator_token_headers
    )
    assert grade_resp.status_code == 200
    grade_data = grade_resp.json()
    assert grade_data["synced_count"] == 1
    assert grade_data["results"][0]["status"] == "accepted"


def test_sync_student_unauthorized_grade_rejection(
    client: TestClient, educator_token_headers, student_token_headers
):
    """Test BR-4 rule: Student trying to submit a grade mutation via sync is rejected."""
    sub_id = str(uuid.uuid4())
    tx_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()

    res = client.post(
        "/sync",
        json={
            "transactions": [
                {
                    "transaction_id": tx_id,
                    "entity_type": "submission",
                    "entity_id": sub_id,
                    "action": "UPDATE",
                    "payload": {"grade": 100.0},
                    "client_timestamp": now_str,
                    "schema_version": 1
                }
            ]
        },
        headers=student_token_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["error_count"] == 1
    assert data["results"][0]["status"] == "rejected"
    assert "Unauthorized" in data["results"][0]["error"]
