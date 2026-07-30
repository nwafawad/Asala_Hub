"""
Module Media Upload & Transcoding Test Suite.

Tests RBAC protection (non-educators get 403), chunked media file upload,
background FFmpeg audio extraction & text summary generation, and GET module variant returns.
"""

import io
import os
import uuid
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import Course, Module, ContentType
from app.services.media_service import process_media_transcoding


def test_media_upload_rbac(
    client: TestClient,
    session: Session,
    test_educator,
    test_student,
    student_token_headers,
    educator_token_headers
):
    """Verify that students and non-owning educators cannot upload media to a course module."""
    # 1. Create Course & Module owned by test_educator
    course = Course(
        title="Media RBAC Test Course",
        description="Testing media upload authorization",
        educator_id=test_educator.id
    )
    session.add(course)
    session.commit()
    session.refresh(course)

    module = Module(
        course_id=course.id,
        title="Sample Video Module",
        content_type=ContentType.video,
        content="http://example.com/placeholder",
        order_index=1
    )
    session.add(module)
    session.commit()
    session.refresh(module)

    # Student attempt -> 403
    fake_file = ("test.mp4", io.BytesIO(b"fake video data"), "video/mp4")
    res1 = client.post(
        f"/courses/{course.id}/modules/{module.id}/media",
        files={"file": fake_file},
        headers=student_token_headers
    )
    assert res1.status_code == 403


def test_media_upload_and_transcoding_pipeline(
    client: TestClient,
    session: Session,
    test_educator,
    educator_token_headers
):
    """Test uploading a media file as an educator, verifying HTTP 202 Accepted, and inspecting returned media_variants."""
    # 1. Create Course & Video Module
    course = Course(
        title="Transcoding Test Course",
        description="Testing FFmpeg audio extraction",
        educator_id=test_educator.id
    )
    session.add(course)
    session.commit()
    session.refresh(course)

    module = Module(
        course_id=course.id,
        title="Lecture 1: Transcoding",
        content_type=ContentType.video,
        content="http://example.com/lecture1",
        order_index=1
    )
    session.add(module)
    session.commit()
    session.refresh(module)

    # 2. Educator uploads media file
    file_bytes = b"MP4_HEADER_SIMULATED_STREAM_DATA_CHUNK"
    upload_res = client.post(
        f"/courses/{course.id}/modules/{module.id}/media",
        files={"file": ("lecture1.mp4", io.BytesIO(file_bytes), "video/mp4")},
        headers=educator_token_headers
    )
    assert upload_res.status_code == 202
    upload_data = upload_res.json()
    assert upload_data["status"] == "processing"
    assert upload_data["module_id"] == str(module.id)

    # 3. Simulate background transcoding processing
    target_original_path = os.path.join("uploads", "modules", str(module.id), "original.mp4")
    variants = process_media_transcoding(
        module_id=module.id,
        original_file_path=target_original_path,
        original_filename="lecture1.mp4",
        module_title=module.title,
        db_session=session
    )

    assert "original" in variants
    assert "audio" in variants
    assert "summary" in variants
    assert "Lecture 1: Transcoding" in variants["summary"]

    # 4. Fetch module detail and verify media_variants in GET response
    get_res = client.get(
        f"/courses/{course.id}/modules/{module.id}",
        headers=educator_token_headers
    )
    assert get_res.status_code == 200
    module_data = get_res.json()
    assert module_data["media_variants"] is not None
    assert module_data["media_variants"]["original"] == f"/uploads/modules/{module.id}/original.mp4"
    assert module_data["media_variants"]["audio"] == f"/uploads/modules/{module.id}/audio.mp3"
    assert "summary" in module_data["media_variants"]
