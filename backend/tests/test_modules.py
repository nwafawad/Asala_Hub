"""
Module Endpoints Test Suite.

Tests module creation, syllabus listing, detail view, and permissions.
"""

from fastapi.testclient import TestClient


def test_module_lifecycle(client: TestClient, educator_token_headers, student_token_headers):
    """Test full module lifecycle: create -> list syllabus -> read detail -> delete."""
    # 1. Create Course
    course_resp = client.post(
        "/courses/",
        json={"title": "Python Programming", "description": "Learn Python"},
        headers=educator_token_headers
    )
    assert course_resp.status_code == 201
    course_id = course_resp.json()["id"]

    # 2. Add Module to Course
    module_payload = {
        "title": "Module 1: Syntax & Variables",
        "content_type": "text",
        "content": "Variables store values in Python.",
        "order_index": 1
    }
    mod_resp = client.post(
        f"/courses/{course_id}/modules",
        json=module_payload,
        headers=educator_token_headers
    )
    assert mod_resp.status_code == 201
    mod_data = mod_resp.json()
    mod_id = mod_data["id"]
    assert mod_data["title"] == module_payload["title"]

    # 3. List Syllabus (content excluded)
    syllabus_resp = client.get(f"/courses/{course_id}/modules", headers=student_token_headers)
    assert syllabus_resp.status_code == 200
    syllabus = syllabus_resp.json()
    assert len(syllabus) == 1
    assert "content" not in syllabus[0]  # Verify content field is deferred for syllabus

    # 4. Get Module Detail (content included)
    detail_resp = client.get(f"/courses/{course_id}/modules/{mod_id}", headers=student_token_headers)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["content"] == module_payload["content"]

    # 5. Delete Module as Educator
    del_resp = client.delete(f"/courses/{course_id}/modules/{mod_id}", headers=educator_token_headers)
    assert del_resp.status_code == 204
