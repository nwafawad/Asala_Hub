"""
Course Endpoints Test Suite.

Tests course creation by educator, student read operations, updating,
deleting, and RBAC permission guards.
"""

from fastapi.testclient import TestClient


def test_create_course_as_educator(client: TestClient, educator_token_headers):
    """Test creating a course with educator role."""
    payload = {
        "title": "Data Structures & Algorithms",
        "description": "Comprehensive course on CS core topics."
    }
    response = client.post("/courses/", json=payload, headers=educator_token_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["description"] == payload["description"]
    assert "id" in data


def test_create_course_forbidden_as_student(client: TestClient, student_token_headers):
    """Test creating a course as a student returns 403 Forbidden."""
    payload = {
        "title": "Unauthorized Course",
        "description": "Students should not be able to create courses."
    }
    response = client.post("/courses/", json=payload, headers=student_token_headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "You do not have permission to perform this action"


def test_list_courses(client: TestClient, educator_token_headers, student_token_headers):
    """Test listing courses as authenticated student and educator."""
    # Create course as educator
    create_resp = client.post(
        "/courses/",
        json={"title": "Linear Algebra", "description": "Math foundation"},
        headers=educator_token_headers
    )
    assert create_resp.status_code == 201

    # Student reads list
    response = client.get("/courses/", headers=student_token_headers)
    assert response.status_code == 200
    courses = response.json()
    assert len(courses) >= 1
    assert courses[0]["title"] == "Linear Algebra"


def test_get_course_404_not_found(client: TestClient, student_token_headers):
    """Test requesting non-existent course returns 404 Not Found."""
    fake_uuid = "00000000-0000-0000-0000-000000000000"
    response = client.get(f"/courses/{fake_uuid}", headers=student_token_headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Course not found"
