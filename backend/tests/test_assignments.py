"""
Assignments & Submission Grading Test Suite.

Tests assignment creation, student submission grading permissions,
and validation rules.
"""

from fastapi.testclient import TestClient


def test_assignment_and_grading(client: TestClient, educator_token_headers, student_token_headers):
    """Test assignment creation and dedicated submission grading endpoint."""
    # 1. Create Course
    course_resp = client.post(
        "/courses/",
        json={"title": "Web Development", "description": "HTML, CSS, JS"},
        headers=educator_token_headers
    )
    course_id = course_resp.json()["id"]

    # 2. Create Assignment
    assign_payload = {
        "title": "Homework 1: CSS Grid",
        "description": "Build a responsive layout using CSS grid.",
        "due_date": "2026-12-31T23:59:59Z"
    }
    assign_resp = client.post(
        f"/courses/{course_id}/assignments",
        json=assign_payload,
        headers=educator_token_headers
    )
    assert assign_resp.status_code == 201
    assign_data = assign_resp.json()
    assert assign_data["title"] == assign_payload["title"]

    # 3. Verify non-existent submission grading returns 404
    fake_sub_id = "00000000-0000-0000-0000-000000000000"
    grade_resp = client.put(
        f"/assignments/{assign_data['id']}/submissions/{fake_sub_id}/grade",
        json={"grade": 95.5, "feedback": "Great work!"},
        headers=educator_token_headers
    )
    assert grade_resp.status_code == 404
    assert grade_resp.json()["detail"] == "Submission not found"
