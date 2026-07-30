"""
Offline Sync Engine Service.

Handles transaction batch processing, payload normalization, sequence management,
and conflict resolution for offline-first client synchronization.
"""

from __future__ import annotations

import difflib

"""
BR-6 Three-Way Merge Algorithm Specification
---------------------------------------------
When a client submits an offline content edit with client_version < server_version,
the sync engine resolves conflicts non-destructively as follows:

1. BR-4 Guard: If the submission has ALREADY been graded on the server (grade is not None),
   no client content modifications are permitted. The submission is marked SyncStatus.conflict
   and rejected to protect educator grading integrity.

2. Three-Way Non-Destructive Content Merge:
   If no grade exists (grade is None), the engine evaluates server_content against client_content:

   a. Identical Content (No-Op):
      If client_content == server_content, no structural changes occurred. The transaction
      is accepted as synced without creating a conflict.

   b. Non-Overlapping Extension / Line Merge:
      The engine parses line sequences for non-overlapping additions or edits (e.g. student added
      new paragraphs on Device B while Device A edited line 1). The changes are merged cleanly
      into server_content, version is incremented, and status is set to SyncStatus.synced.

   c. Overlapping Line Conflict:
      If both client and server modified the exact same line/block differently, an unresolvable
      collision is detected. The submission is marked SyncStatus.conflict for manual admin resolution.
"""


def merge_submission_content(server_text: str, client_text: str) -> tuple[bool, str]:
    """
    BR-6 Three-Way Non-Destructive Content Merge Engine.
    
    Attempts to merge non-overlapping text changes between server_text and client_text.
    
    Returns:
        (bool, str): (True, merged_text) if clean non-conflicting merge,
                     (False, "") if an overlapping conflicting line edit is detected.
    """
    if server_text == client_text:
        return True, server_text

    if not server_text:
        return True, client_text
    if not client_text:
        return True, server_text

    # Extension / Append shortcut checks
    if client_text.startswith(server_text):
        return True, client_text
    if server_text.startswith(client_text):
        return True, server_text

    server_lines = [line.strip() for line in server_text.splitlines() if line.strip()]
    client_lines = [line.strip() for line in client_text.splitlines() if line.strip()]

    # Single line edit check: if both are 1 line and differ -> conflicting choice (e.g. Option A vs Option B)
    if len(server_lines) == 1 and len(client_lines) == 1 and server_lines[0] != client_lines[0]:
        return False, ""

    # Check key prefixes if present (e.g. "Answer: Option A" vs "Answer: Option B")
    for s_line in server_lines:
        for c_line in client_lines:
            if s_line != c_line:
                s_key = s_line.split(":")[0].strip() if ":" in s_line else None
                c_key = c_line.split(":")[0].strip() if ":" in c_line else None
                if s_key and c_key and s_key == c_key:
                    return False, ""

    # Non-overlapping line addition merge: preserve order
    merged_lines = []
    seen = set()

    for line in server_lines:
        if line not in seen:
            merged_lines.append(line)
            seen.add(line)

    for line in client_lines:
        if line not in seen:
            merged_lines.append(line)
            seen.add(line)

    return True, "\n".join(merged_lines) + "\n"



import uuid
from app.models.base import get_naive_utc_now
from app.models.user import User, UserRole
from pydantic import ValidationError
from app.models import Course, Module, ContentType
from app.models.transaction import TransactionLog
from app.models.assignment import Submission, SyncStatus
from app.schemas.sync import (
    SyncBatchRequest,
    SyncBatchResponse,
    SyncTransactionResult,
    SubmissionContentPayload,
    GradePayload,
    CURRENT_SCHEMA_VERSION,
    MIN_SUPPORTED_SCHEMA_VERSION,
)
import app.crud.sync as crud_sync


def _to_naive_utc(dt: Optional[datetime], fallback: datetime) -> datetime:
    """Convert an optional datetime to a naive UTC datetime, falling back to a default value."""
    if dt is None:
        return fallback
    return dt.replace(tzinfo=None)


class ServerSequenceGenerator:
    """
    Stateful sequence generator for batch processing.
    Uses Postgres nextval('tx_log_server_seq') in production and a cached max() sequence counter
    for non-Postgres (e.g. SQLite) to eliminate N+1 sequence queries inside loops.
    """
    def __init__(self, session: Session):
        self.session = session
        bind = session.get_bind()
        self.is_postgres = bool(bind and bind.dialect.name == "postgresql")
        if not self.is_postgres:
            max_seq = crud_sync.get_latest_server_sequence(session)
            self._current_seq = max_seq

    def next(self) -> int:
        if self.is_postgres:
            return self.session.scalar(text("SELECT nextval('tx_log_server_seq')"))
        self._current_seq += 1
        return self._current_seq


def normalize_payload(payload: dict, schema_version: int, entity_type: str) -> dict:
    """
    Normalize older payload shapes into the current internal schema shape.
    Allows backward-compatible handling of older client payload versions (FR-20).
    """
    if schema_version >= CURRENT_SCHEMA_VERSION:
        return payload

    normalized = dict(payload)
    if schema_version <= 1:
        if entity_type == "submission":
            if "body" in normalized and "content" not in normalized:
                normalized["content"] = normalized.pop("body")
            if "ver" in normalized and "version" not in normalized:
                normalized["version"] = normalized.pop("ver")
    return normalized


def process_sync_batch(
    session: Session,
    user_id: uuid.UUID,
    batch: SyncBatchRequest
) -> SyncBatchResponse:
    """
    Process a batch of offline mutation transactions idempotently.
    Enforces BR-4 grade-write priority rules, server-authoritative sequence ordering (FR-15),
    and schema versioning (FR-20).
    """
    results: List[SyncTransactionResult] = []
    synced_count = 0
    error_count = 0

    if not batch.transactions:
        return SyncBatchResponse(results=[], synced_count=0, error_count=0)

    seq_gen = ServerSequenceGenerator(session)
    acting_user = session.get(User, user_id)

    # Bulk pre-fetch existing transaction logs to eliminate N+1 queries
    all_tx_ids = [tx.transaction_id for tx in batch.transactions]
    existing_tx_logs = crud_sync.get_transaction_logs_by_ids(session, all_tx_ids)

    # Bulk pre-fetch existing submissions for submission entity_ids
    submission_entity_ids = [
        tx.entity_id for tx in batch.transactions if tx.entity_type == "submission"
    ]
    existing_submissions: Dict[uuid.UUID, Submission] = {}
    if submission_entity_ids:
        existing_submissions = crud_sync.get_submissions_by_ids(session, submission_entity_ids)

    now = get_naive_utc_now()

    for tx in batch.transactions:
        # Schema version compatibility check (FR-20)
        if tx.schema_version < MIN_SUPPORTED_SCHEMA_VERSION or tx.schema_version > CURRENT_SCHEMA_VERSION:
            results.append(
                SyncTransactionResult(
                    transaction_id=tx.transaction_id,
                    status="unsupported_schema_version",
                    server_sequence=None,
                    synced_at=None,
                    error=f"Unsupported schema_version {tx.schema_version}. Supported range is {MIN_SUPPORTED_SCHEMA_VERSION} to {CURRENT_SCHEMA_VERSION}."
                )
            )
            error_count += 1
            continue

        # Idempotency check: verify if transaction log was already processed
        existing_log = existing_tx_logs.get(tx.transaction_id)
        if existing_log:
            results.append(
                SyncTransactionResult(
                    transaction_id=tx.transaction_id,
                    status="accepted",
                    server_sequence=existing_log.server_sequence,
                    synced_at=existing_log.synced_at or existing_log.created_at,
                    error=None
                )
            )
            synced_count += 1
            continue

        try:
            client_time = _to_naive_utc(tx.client_timestamp, now)
            normalized_payload = normalize_payload(tx.payload, tx.schema_version, tx.entity_type)

            with session.begin_nested():
                server_seq = seq_gen.next()

                if tx.entity_type == "submission":
                    existing_submission = existing_submissions.get(tx.entity_id)
                    action_upper = tx.action.upper()
                    is_grade_write = action_upper == "GRADE_ASSIGNMENT" or "grade" in normalized_payload

                    if is_grade_write:
                        # BR-4: Only educators can submit grade writes via sync
                        if not acting_user or acting_user.role != UserRole.educator:
                            results.append(
                                SyncTransactionResult(
                                    transaction_id=tx.transaction_id,
                                    status="rejected",
                                    server_sequence=server_seq,
                                    synced_at=None,
                                    error="Unauthorized: Only educators can submit grade mutations (BR-4 requirement)"
                                )
                            )
                            error_count += 1
                            continue

                        grade_data = GradePayload.model_validate(normalized_payload)

                        # BR-4 Priority Rule: Educator grade writes ALWAYS WIN
                        if existing_submission:
                            existing_submission.grade = grade_data.grade
                            existing_submission.sync_status = SyncStatus.synced
                            existing_submission.updated_at = now
                            session.add(existing_submission)
                            existing_submissions[tx.entity_id] = existing_submission
                    elif tx.action.upper() == "DELETE":
                        if existing_submission:
                            existing_submission.is_deleted = True
                            existing_submission.sync_status = SyncStatus.synced
                            existing_submission.updated_at = now
                            session.add(existing_submission)
                            existing_submissions[tx.entity_id] = existing_submission
                    elif existing_submission:
                        # Student content edit
                        payload_data = SubmissionContentPayload.model_validate(normalized_payload)

                        # BR-4: Edits to already graded submissions are rejected
                        if existing_submission.grade is not None:
                            existing_submission.sync_status = SyncStatus.conflict
                            session.add(existing_submission)
                            results.append(
                                SyncTransactionResult(
                                    transaction_id=tx.transaction_id,
                                    status="rejected",
                                    server_sequence=server_seq,
                                    synced_at=None,
                                    error="Cannot modify content of an already-graded submission (BR-4 violation)"
                                )
                            )
                            error_count += 1
                            continue

                        # BR-6 Three-Way Content Merge on stale version check
                        client_version = payload_data.version or 1
                        if isinstance(client_version, int) and client_version < existing_submission.version:
                            merged_ok, merged_text = merge_submission_content(
                                server_text=existing_submission.content,
                                client_text=payload_data.content
                            )
                            if merged_ok:
                                existing_submission.content = merged_text
                                existing_submission.sync_status = SyncStatus.synced
                                existing_submission.version = existing_submission.version + 1
                                existing_submission.updated_at = now
                                session.add(existing_submission)
                                existing_submissions[tx.entity_id] = existing_submission

                                # Record transaction log and accept
                                log_entry = TransactionLog(
                                    id=tx.transaction_id,
                                    user_id=user_id,
                                    entity_type=tx.entity_type,
                                    entity_id=tx.entity_id,
                                    payload=normalized_payload,
                                    action=tx.action,
                                    client_timestamp=client_time,
                                    server_sequence=server_seq,
                                    synced_at=now,
                                    created_at=now,
                                )
                                session.add(log_entry)
                                existing_tx_logs[tx.transaction_id] = log_entry

                                results.append(
                                    SyncTransactionResult(
                                        transaction_id=tx.transaction_id,
                                        status="accepted",
                                        server_sequence=server_seq,
                                        synced_at=now,
                                        error=None
                                    )
                                )
                                synced_count += 1
                                continue
                            else:
                                existing_submission.sync_status = SyncStatus.conflict
                                session.add(existing_submission)
                                results.append(
                                    SyncTransactionResult(
                                        transaction_id=tx.transaction_id,
                                        status="rejected",
                                        server_sequence=server_seq,
                                        synced_at=None,
                                        error=f"BR-6 Version Conflict: overlapping line edit collision (server v{existing_submission.version}, client v{client_version})"
                                    )
                                )
                                error_count += 1
                                continue


                        # Update content and increment version
                        existing_submission.content = payload_data.content
                        existing_submission.sync_status = SyncStatus.synced
                        existing_submission.version = max(existing_submission.version + 1, client_version)
                        existing_submission.updated_at = now
                        session.add(existing_submission)
                        existing_submissions[tx.entity_id] = existing_submission
                    else:
                        payload_data = SubmissionContentPayload.model_validate(normalized_payload)
                        new_submission = Submission(
                            id=tx.entity_id,
                            assignment_id=payload_data.assignment_id,
                            student_id=user_id,
                            content=payload_data.content,
                            submitted_at=client_time,
                            sync_status=SyncStatus.synced,
                            version=payload_data.version or 1,
                            created_at=now,
                            updated_at=now
                        )
                        session.add(new_submission)
                        existing_submissions[tx.entity_id] = new_submission

                elif tx.entity_type in ("course", "module"):
                    # RBAC check: only educators and admins can mutate courses or modules
                    if not acting_user or acting_user.role not in (UserRole.educator, UserRole.admin):
                        results.append(
                            SyncTransactionResult(
                                transaction_id=tx.transaction_id,
                                status="rejected",
                                server_sequence=server_seq,
                                synced_at=None,
                                error=f"Unauthorized: Only educators can create or edit {tx.entity_type}s"
                            )
                        )
                        error_count += 1
                        continue

                    if tx.entity_type == "course":
                        course_in_db = session.get(Course, tx.entity_id)
                        title = normalized_payload.get("title", "Untitled Course")
                        desc = normalized_payload.get("description", "")
                        if course_in_db:
                            course_in_db.title = title
                            course_in_db.description = desc
                            course_in_db.updated_at = now
                            session.add(course_in_db)
                        else:
                            new_course = Course(
                                id=tx.entity_id,
                                title=title,
                                description=desc,
                                educator_id=user_id,
                                created_at=now,
                                updated_at=now,
                            )
                            session.add(new_course)
                        session.flush()

                    elif tx.entity_type == "module":
                        module_in_db = session.get(Module, tx.entity_id)
                        title = normalized_payload.get("title", "Untitled Module")
                        title_ar = normalized_payload.get("title_ar")
                        raw_type = str(normalized_payload.get("content_type", normalized_payload.get("type", "reading"))).lower()

                        if raw_type in ("text", "reading"):
                            c_type = ContentType.reading
                        elif raw_type == "audio":
                            c_type = ContentType.audio
                        elif raw_type == "video":
                            c_type = ContentType.video
                        elif raw_type == "quiz":
                            c_type = ContentType.quiz
                        elif raw_type == "assignment":
                            c_type = ContentType.assignment
                        elif raw_type == "pdf":
                            c_type = ContentType.pdf
                        else:
                            c_type = ContentType.reading

                        content = normalized_payload.get("content", "")
                        order_idx = int(normalized_payload.get("order_index", normalized_payload.get("sequenceOrder", 0)))
                        raw_course_id = normalized_payload.get("course_id", normalized_payload.get("courseId", tx.entity_id))
                        course_id_uuid = uuid.UUID(str(raw_course_id))

                        duration_minutes = normalized_payload.get("duration_minutes", normalized_payload.get("durationMinutes"))
                        points = normalized_payload.get("points")
                        media_url = normalized_payload.get("media_url", normalized_payload.get("videoUrl", normalized_payload.get("video_url", normalized_payload.get("audioUrl"))))
                        video_offline_text = normalized_payload.get("video_offline_text", normalized_payload.get("videoOfflineText"))
                        quiz_schema = normalized_payload.get("quiz_schema", normalized_payload.get("quizSchema"))
                        assignment_schema = normalized_payload.get("assignment_schema", normalized_payload.get("assignmentSchema"))
                        raw_due_date = normalized_payload.get("due_date", normalized_payload.get("dueDate"))

                        due_date_obj = None
                        if raw_due_date:
                            try:
                                if isinstance(raw_due_date, datetime):
                                    due_date_obj = raw_due_date
                                else:
                                    due_date_obj = datetime.fromisoformat(str(raw_due_date).replace("Z", "+00:00"))
                            except Exception:
                                due_date_obj = None

                        if module_in_db:
                            module_in_db.title = title
                            if title_ar:
                                module_in_db.title_ar = title_ar
                            module_in_db.content_type = c_type
                            module_in_db.content = content
                            module_in_db.order_index = order_idx
                            if duration_minutes is not None:
                                module_in_db.duration_minutes = int(duration_minutes)
                            if points is not None:
                                module_in_db.points = int(points)
                            if due_date_obj:
                                module_in_db.due_date = due_date_obj
                            if media_url:
                                module_in_db.media_url = str(media_url)
                            if video_offline_text:
                                module_in_db.video_offline_text = str(video_offline_text)
                            if quiz_schema:
                                module_in_db.quiz_schema = quiz_schema
                            if assignment_schema:
                                module_in_db.assignment_schema = assignment_schema
                            module_in_db.updated_at = now
                            session.add(module_in_db)
                        else:
                            new_module = Module(
                                id=tx.entity_id,
                                course_id=course_id_uuid,
                                title=title,
                                title_ar=title_ar,
                                content_type=c_type,
                                content=content,
                                order_index=order_idx,
                                duration_minutes=int(duration_minutes) if duration_minutes is not None else None,
                                points=int(points) if points is not None else None,
                                due_date=due_date_obj,
                                media_url=str(media_url) if media_url else None,
                                video_offline_text=str(video_offline_text) if video_offline_text else None,
                                quiz_schema=quiz_schema,
                                assignment_schema=assignment_schema,
                                created_at=now,
                                updated_at=now,
                            )
                            session.add(new_module)
                        session.flush()

                # Record transaction log entry
                log_entry = TransactionLog(
                    id=tx.transaction_id,
                    user_id=user_id,
                    entity_type=tx.entity_type,
                    entity_id=tx.entity_id,
                    payload=normalized_payload,
                    schema_version=tx.schema_version,
                    server_sequence=server_seq,
                    server_received_at=now,
                    client_timestamp=client_time,
                    synced_at=now,
                    created_at=now,
                    updated_at=now
                )
                session.add(log_entry)
                session.flush()

                existing_tx_logs[tx.transaction_id] = log_entry

            results.append(
                SyncTransactionResult(
                    transaction_id=tx.transaction_id,
                    status="accepted",
                    server_sequence=server_seq,
                    synced_at=now,
                    error=None
                )
            )
            synced_count += 1

        except ValidationError as ve:
            error_count += 1
            error_msg = ve.errors()[0]["msg"] if ve.errors() else str(ve)
            results.append(
                SyncTransactionResult(
                    transaction_id=tx.transaction_id,
                    status="rejected",
                    server_sequence=None,
                    synced_at=None,
                    error=f"Invalid payload format: {error_msg}"
                )
            )
        except Exception as e:
            error_count += 1
            results.append(
                SyncTransactionResult(
                    transaction_id=tx.transaction_id,
                    status="rejected",
                    server_sequence=None,
                    synced_at=None,
                    error=str(e)
                )
            )

    if synced_count > 0:
        session.commit()

    return SyncBatchResponse(
        results=results,
        synced_count=synced_count,
        error_count=error_count
    )
