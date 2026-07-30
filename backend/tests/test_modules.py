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

    # 5. Add Interactive Quiz Module
    quiz_payload = {
        "title": "Module 2: Quiz Assessment",
        "title_ar": "الاختبار التفاعلي",
        "content_type": "quiz",
        "content": "Interactive Quiz Module",
        "order_index": 2,
        "quiz_schema": {
            "questions": [
                {
                    "id": "q-1",
                    "type": "multiple_choice",
                    "prompt": "What is Python?",
                    "options": [
                        {"id": "opt-1", "text": "Programming language", "is_correct": True},
                        {"id": "opt-2", "text": "Snake", "is_correct": False}
                    ],
                    "points": 10
                }
            ],
            "passing_score_percentage": 80
        }
    }
    quiz_resp = client.post(
        f"/courses/{course_id}/modules",
        json=quiz_payload,
        headers=educator_token_headers
    )
    assert quiz_resp.status_code == 201
    quiz_data = quiz_resp.json()
    assert quiz_data["content_type"] == "quiz"
    assert quiz_data["quiz_schema"]["passing_score_percentage"] == 80

    # 6. Add Video Module with Offline Text Fallback
    video_payload = {
        "title": "Module 3: Video Lecture",
        "content_type": "video",
        "content": "Video lesson overview",
        "order_index": 3,
        "media_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "video_offline_text": "Offline transcript text for video"
    }
    video_resp = client.post(
        f"/courses/{course_id}/modules",
        json=video_payload,
        headers=educator_token_headers
    )
    assert video_resp.status_code == 201
    video_data = video_resp.json()
    assert video_data["content_type"] == "video"
    assert video_data["video_offline_text"] == "Offline transcript text for video"

    # 7. Delete Modules as Educator
    del_resp = client.delete(f"/courses/{course_id}/modules/{mod_id}", headers=educator_token_headers)
    assert del_resp.status_code == 204
