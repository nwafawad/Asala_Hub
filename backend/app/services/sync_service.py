"""
Offline Sync Engine Service.

Handles transaction batch processing, payload normalization, sequence management,
and conflict resolution for offline-first client synchronization.
"""

from __future__ import annotations

import difflib
import uuid
from typing import List, Dict, Optional, Any
from datetime import datetime
from collections import OrderedDict
from sqlalchemy import text as sa_text
from sqlmodel import Session
from pydantic import ValidationError

from app.models.base import get_naive_utc_now
from app.models.user import User, UserRole
from app.models import Course, Module, ContentType
from app.models.transaction import TransactionLog
from app.models.assignment import Submission, SyncStatus
from app.schemas.sync import (
    SyncBatchRequest,
    SyncBatchResponse,
    SyncTransactionResult,
    SubmissionContentPayload,
    GradePayload,
    _coerce_uuid,
    CURRENT_SCHEMA_VERSION,
    MIN_SUPPORTED_SCHEMA_VERSION,
)
import app.crud.sync as crud_sync


def _to_naive_utc(dt: Optional[datetime], fallback: datetime) -> datetime:
    """Convert an optional datetime to a naive UTC datetime, falling back to a default value."""
    if dt is None:
        return fallback
    return dt.replace(tzinfo=None)


from collections import OrderedDict

class IdempotencyLRUCache:
    """
    High-performance in-memory LRU cache storing recently processed transaction UUIDs.
    Eliminates disk I/O queries for duplicate transaction retry processing (O(1) lookup).
    """
    def __init__(self, maxsize: int = 10000):
        self.cache: OrderedDict[uuid.UUID, int] = OrderedDict()
        self.maxsize = maxsize

    def get(self, tx_id: uuid.UUID) -> Optional[int]:
        if tx_id in self.cache:
            self.cache.move_to_end(tx_id)
            return self.cache[tx_id]
        return None

    def put(self, tx_id: uuid.UUID, server_seq: int):
        self.cache[tx_id] = server_seq
        self.cache.move_to_end(tx_id)
        if len(self.cache) > self.maxsize:
            self.cache.popitem(last=False)

idempotency_cache = IdempotencyLRUCache()


class ServerSequenceGenerator:
    """
    Stateful bulk sequence generator for batch processing.
    Allocates a block of N sequence numbers in a single SQL query on PostgreSQL (O(1) complexity),
    and uses a cached max sequence counter for non-Postgres (e.g. SQLite).
    """
    def __init__(self, session: Session, count: int = 1):
        self.session = session
        bind = session.get_bind()
        self.is_postgres = bool(bind and bind.dialect.name == "postgresql")
        if self.is_postgres and count > 0:
            # Allocate sequence block of size count in 1 atomic DB query
            end_seq = session.scalar(
                sa_text("SELECT setval('tx_log_server_seq', nextval('tx_log_server_seq') + :inc)"),
                {"inc": count - 1}
            )
            self._current_seq = (end_seq or 100) - count
        else:
            max_seq = crud_sync.get_latest_server_sequence(session)
            self._current_seq = max_seq

    def next(self) -> int:
        self._current_seq += 1
        return self._current_seq


def normalize_payload(payload: dict, schema_version: int, entity_type: str) -> dict:
    """
    Normalize older payload shapes into the current internal schema shape.
    Allows backward-compatible handling of older client payload versions (FR-20).
    """
    normalized = dict(payload)
    if entity_type == "submission":
        if "score" in normalized and "grade" not in normalized:
            try:
                normalized["grade"] = float(normalized["score"])
            except (ValueError, TypeError):
                pass
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

    # Sort transactions by entity_type and entity_id to guarantee deadlock-free lock acquisition order
    sorted_transactions = sorted(
        batch.transactions,
        key=lambda tx: (str(tx.entity_type), str(tx.entity_id))
    )

    seq_gen = ServerSequenceGenerator(session, count=len(sorted_transactions))
    acting_user = session.get(User, user_id)

    # Bulk pre-fetch existing transaction logs to eliminate N+1 queries
    all_tx_ids = [tx.transaction_id for tx in sorted_transactions]
    existing_tx_logs = crud_sync.get_transaction_logs_by_ids(session, all_tx_ids)

    # Bulk pre-fetch existing submissions for submission entity_ids
    submission_entity_ids = [
        tx.entity_id for tx in sorted_transactions if tx.entity_type == "submission"
    ]
    existing_submissions: Dict[uuid.UUID, Submission] = {}
    if submission_entity_ids:
        existing_submissions = crud_sync.get_submissions_by_ids(session, submission_entity_ids)

    now = get_naive_utc_now()

    for tx in sorted_transactions:
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

        # Fast In-Memory LRU Idempotency check (Stage 3 optimization)
        cached_seq = idempotency_cache.get(tx.transaction_id)
        existing_log = existing_tx_logs.get(tx.transaction_id)
        if cached_seq is not None or existing_log:
            res_seq = cached_seq if cached_seq is not None else existing_log.server_sequence
            results.append(
                SyncTransactionResult(
                    transaction_id=tx.transaction_id,
                    status="accepted",
                    server_sequence=res_seq,
                    synced_at=now,
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

                elif tx.entity_type in ("course", "module", "assignment"):
                    # RBAC check: only educators and admins can mutate courses, modules, or assignments
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

                    elif tx.entity_type in ("module", "assignment"):
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
                        course_id_uuid = _coerce_uuid(raw_course_id)

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
                    action=tx.action,
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
                idempotency_cache.put(tx.transaction_id, server_seq)

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


def post_sync_telemetry(user_id: uuid.UUID, synced_count: int) -> None:
    """
    Non-blocking async background task executed after returning POST /sync response.
    Handles post-sync metrics logging and side-effects without blocking HTTP execution.
    """
    if synced_count > 0:
        import logging
        logger = logging.getLogger("asala_hub.sync")
        logger.info(f"Post-sync telemetry: user {user_id} successfully synced {synced_count} offline transactions.")
