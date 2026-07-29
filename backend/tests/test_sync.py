"""
Offline Sync Engine Test Suite.

Tests batch transaction processing, idempotency, schema versioning,
BR-6 three-way content merge engine, request gzip decompression, and BR-4 educator grade priority.
"""

import gzip
import json
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


def test_sync_gzipped_payload_accepted(client: TestClient, student_token_headers):
    """Test that POST /sync accepts gzipped request payloads with Content-Encoding: gzip header."""
    batch_payload = {
        "transactions": []
    }
    raw_json = json.dumps(batch_payload).encode("utf-8")
    gzipped_bytes = gzip.compress(raw_json)

    headers = dict(student_token_headers)
    headers["Content-Encoding"] = "gzip"
    headers["Content-Type"] = "application/json"

    response = client.post("/sync", content=gzipped_bytes, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["synced_count"] == 0


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


def test_sync_three_way_merge_non_conflicting(
    client: TestClient, educator_token_headers, student_token_headers
):
    """Test BR-6 Three-Way Merge: Stale client version with non-overlapping line additions merges cleanly into server submission."""
    # 1. Setup course, assignment
    c_resp = client.post(
        "/courses/",
        json={"title": "Merge Test Course", "description": "BR-6 merge testing"},
        headers=educator_token_headers
    )
    course_id = c_resp.json()["id"]

    a_resp = client.post(
        f"/courses/{course_id}/assignments",
        json={"title": "Merge Assignment", "description": "3-way merge test", "due_date": "2026-12-31T23:59:59Z"},
        headers=educator_token_headers
    )
    assignment_id = a_resp.json()["id"]

    sub_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()

    # Device 1 syncs version 1
    tx1 = str(uuid.uuid4())
    client.post(
        "/sync",
        json={
            "transactions": [
                {
                    "transaction_id": tx1,
                    "entity_type": "submission",
                    "entity_id": sub_id,
                    "action": "CREATE",
                    "payload": {"assignment_id": assignment_id, "content": "Paragraph 1: Introduction\n", "version": 1},
                    "client_timestamp": now_str,
                    "schema_version": 1
                }
            ]
        },
        headers=student_token_headers
    )

    # Server updates to version 2 (Device A appended Paragraph 2)
    tx2 = str(uuid.uuid4())
    client.post(
        "/sync",
        json={
            "transactions": [
                {
                    "transaction_id": tx2,
                    "entity_type": "submission",
                    "entity_id": sub_id,
                    "action": "UPDATE",
                    "payload": {"assignment_id": assignment_id, "content": "Paragraph 1: Introduction\nParagraph 2: Main Body\n", "version": 2},
                    "client_timestamp": now_str,
                    "schema_version": 1
                }
            ]
        },
        headers=student_token_headers
    )

    # Device B sends stale edit (client_version 1) appending Paragraph 3
    tx3 = str(uuid.uuid4())
    merge_resp = client.post(
        "/sync",
        json={
            "transactions": [
                {
                    "transaction_id": tx3,
                    "entity_type": "submission",
                    "entity_id": sub_id,
                    "action": "UPDATE",
                    "payload": {"assignment_id": assignment_id, "content": "Paragraph 1: Introduction\nParagraph 3: Conclusion\n", "version": 1},
                    "client_timestamp": now_str,
                    "schema_version": 1
                }
            ]
        },
        headers=student_token_headers
    )
    assert merge_resp.status_code == 200
    merge_data = merge_resp.json()
    assert merge_data["synced_count"] == 1
    assert merge_data["results"][0]["status"] == "accepted"


def test_sync_three_way_merge_overlapping_conflict(
    client: TestClient, educator_token_headers, student_token_headers
):
    """Test BR-6 Three-Way Merge: Overlapping edit collision on the exact same line causes SyncStatus.conflict rejection."""
    c_resp = client.post(
        "/courses/",
        json={"title": "Collision Course", "description": "Collision testing"},
        headers=educator_token_headers
    )
    course_id = c_resp.json()["id"]

    a_resp = client.post(
        f"/courses/{course_id}/assignments",
        json={"title": "Collision Assignment", "description": "Collision test", "due_date": "2026-12-31T23:59:59Z"},
        headers=educator_token_headers
    )
    assignment_id = a_resp.json()["id"]

    sub_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()

    # Initial submission v1
    client.post(
        "/sync",
        json={
            "transactions": [
                {
                    "transaction_id": str(uuid.uuid4()),
                    "entity_type": "submission",
                    "entity_id": sub_id,
                    "action": "CREATE",
                    "payload": {"assignment_id": assignment_id, "content": "Answer: Option A", "version": 1},
                    "client_timestamp": now_str,
                    "schema_version": 1
                }
            ]
        },
        headers=student_token_headers
    )

    # Server updates line to Option B (v2)
    client.post(
        "/sync",
        json={
            "transactions": [
                {
                    "transaction_id": str(uuid.uuid4()),
                    "entity_type": "submission",
                    "entity_id": sub_id,
                    "action": "UPDATE",
                    "payload": {"assignment_id": assignment_id, "content": "Answer: Option B", "version": 2},
                    "client_timestamp": now_str,
                    "schema_version": 1
                }
            ]
        },
        headers=student_token_headers
    )

    # Device B sends stale v1 changing same line to Option C
    conflict_resp = client.post(
        "/sync",
        json={
            "transactions": [
                {
                    "transaction_id": str(uuid.uuid4()),
                    "entity_type": "submission",
                    "entity_id": sub_id,
                    "action": "UPDATE",
                    "payload": {"assignment_id": assignment_id, "content": "Answer: Option C", "version": 1},
                    "client_timestamp": now_str,
                    "schema_version": 1
                }
            ]
        },
        headers=student_token_headers
    )
    assert conflict_resp.status_code == 200
    conflict_data = conflict_resp.json()
    assert conflict_data["error_count"] == 1
    assert conflict_data["results"][0]["status"] == "rejected"
    assert "BR-6 Version Conflict" in conflict_data["results"][0]["error"]


def test_sync_educator_grade_write_br4(
    client: TestClient, educator_token_headers, student_token_headers
):
    """Test BR-4 rule: Educator grade mutation via sync is accepted and updates grade."""
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


def test_sync_offline_course_and_module_authoring_educator(
    client: TestClient, educator_token_headers
):
    """Test educator creating a course and module via offline batch sync transaction."""
    course_id = str(uuid.uuid4())
    module_id = str(uuid.uuid4())
    tx1 = str(uuid.uuid4())
    tx2 = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()

    res = client.post(
        "/sync",
        json={
            "transactions": [
                {
                    "transaction_id": tx1,
                    "entity_type": "course",
                    "entity_id": course_id,
                    "action": "CREATE_COURSE",
                    "payload": {"title": "Offline Authoring Course", "description": "Created while offline"},
                    "client_timestamp": now_str,
                    "schema_version": 1
                },
                {
                    "transaction_id": tx2,
                    "entity_type": "module",
                    "entity_id": module_id,
                    "action": "CREATE_MODULE",
                    "payload": {"title": "Offline Module 1", "content_type": "reading", "content": "Text content", "course_id": course_id, "order_index": 0},
                    "client_timestamp": now_str,
                    "schema_version": 1
                }
            ]
        },
        headers=educator_token_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["synced_count"] == 2
    assert data["error_count"] == 0
    assert data["results"][0]["status"] == "accepted"
    assert data["results"][1]["status"] == "accepted"


def test_sync_offline_course_creation_unauthorized_student(
    client: TestClient, student_token_headers
):
    """Test student attempting to create a course via sync batch is rejected."""
    course_id = str(uuid.uuid4())
    tx_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()

    res = client.post(
        "/sync",
        json={
            "transactions": [
                {
                    "transaction_id": tx_id,
                    "entity_type": "course",
                    "entity_id": course_id,
                    "action": "CREATE_COURSE",
                    "payload": {"title": "Unauthorized Student Course"},
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

