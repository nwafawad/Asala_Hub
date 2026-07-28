"""
Campus Sync Service.

Manages scheduled background synchronization of on-campus PostgreSQL transaction logs
to the central cloud deployment endpoint, featuring exponential backoff retries,
service-account JWT authentication, and bulk database reconciliation.
"""

from __future__ import annotations

import uuid
import time
import logging
import asyncio
from typing import List, Optional, Union
from datetime import datetime, timezone
import httpx
from sqlmodel import Session, select, update, col

from app.core.config import settings
from app.core.database import get_session
from app.core.security import create_access_token
from app.models import TransactionLog, UserRole
from app.models.base import get_naive_utc_now
from app.schemas.sync import (
    SyncBatchRequest,
    SyncBatchResponse,
    SyncTransactionIn,
)

logger = logging.getLogger("asala_hub.campus_sync")


def get_unsynced_transaction_logs(
    session: Session, limit: int = settings.CAMPUS_SYNC_BATCH_SIZE
) -> List[TransactionLog]:
    """
    Query unsynced transaction logs from local campus database.
    """
    return list(
        session.exec(
            select(TransactionLog)
            .where(col(TransactionLog.synced_at) == None)
            .order_by(col(TransactionLog.created_at).asc())
            .limit(limit)
        ).all()
    )


def build_sync_batch_request(logs: List[TransactionLog]) -> SyncBatchRequest:
    """
    Convert TransactionLog database rows into SyncBatchRequest DTO.
    """
    transactions: List[SyncTransactionIn] = []
    for log in logs:
        action = "UPDATE"
        if isinstance(log.payload, dict) and "action" in log.payload:
            action = str(log.payload["action"])

        tx_in = SyncTransactionIn(
            transaction_id=log.id,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            action=action,
            payload=log.payload,
            client_timestamp=log.client_timestamp,
            schema_version=log.schema_version,
        )
        transactions.append(tx_in)

    return SyncBatchRequest(transactions=transactions)


def get_effective_service_token() -> str:
    """
    Get configured campus service account token or generate a service account JWT.
    """
    if settings.CAMPUS_SERVICE_ACCOUNT_TOKEN and settings.CAMPUS_SERVICE_ACCOUNT_TOKEN.strip():
        return settings.CAMPUS_SERVICE_ACCOUNT_TOKEN.strip()

    # Fallback default service account UUID
    service_user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    return create_access_token(subject=service_user_id, role=UserRole.admin.value)


def mark_logs_as_synced(session: Session, log_ids: List[uuid.UUID], logs_objs: Optional[List[TransactionLog]] = None) -> None:
    """
    Bulk update synced_at timestamp on transaction log records in a single SQL operation.
    """
    if not log_ids:
        return

    now = get_naive_utc_now()
    # Bulk update query
    session.exec(
        update(TransactionLog)
        .where(col(TransactionLog.id).in_(log_ids))
        .values(synced_at=now)
    )
    if logs_objs:
        for log in logs_objs:
            if log.id in log_ids:
                log.synced_at = now
                session.add(log)
    session.commit()


def push_campus_batch_to_cloud(
    session: Session, client: Optional[httpx.Client] = None
) -> int:
    """
    Synchronous batch push with exponential backoff retry logic.
    """
    logs = get_unsynced_transaction_logs(session)
    if not logs:
        return 0

    batch_request = build_sync_batch_request(logs)
    token = get_effective_service_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    max_retries = settings.CAMPUS_SYNC_MAX_RETRIES
    close_client = False

    if client is None:
        client = httpx.Client(timeout=10.0)
        close_client = True

    try:
        for attempt in range(1, max_retries + 1):
            try:
                response = client.post(
                    settings.CLOUD_SYNC_ENDPOINT,
                    json=batch_request.model_dump(mode="json"),
                    headers=headers,
                )

                if response.status_code == 200:
                    batch_response = SyncBatchResponse.model_validate(response.json())
                    accepted_ids = [
                        res.transaction_id
                        for res in batch_response.results
                        if res.status == "accepted"
                    ]

                    if accepted_ids:
                        mark_logs_as_synced(session, accepted_ids, logs_objs=logs)

                    logger.info(
                        f"Campus sync batch push success: {batch_response.synced_count} accepted, {batch_response.error_count} errors"
                    )
                    return batch_response.synced_count

                logger.warning(
                    f"Campus sync HTTP {response.status_code} on attempt {attempt}/{max_retries}: {response.text}"
                )

            except (httpx.RequestError, Exception) as e:
                logger.warning(
                    f"Campus sync connection error on attempt {attempt}/{max_retries}: {e}"
                )

            if attempt < max_retries:
                sleep_duration = 0.5 * (2 ** (attempt - 1))
                time.sleep(sleep_duration)

    finally:
        if close_client:
            client.close()

    return 0


async def push_campus_batch_to_cloud_async(
    session: Session, client: Optional[httpx.AsyncClient] = None
) -> int:
    """
    Non-blocking async batch push with non-blocking asyncio backoff sleep.
    """
    logs = get_unsynced_transaction_logs(session)
    if not logs:
        return 0

    batch_request = build_sync_batch_request(logs)
    token = get_effective_service_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    max_retries = settings.CAMPUS_SYNC_MAX_RETRIES
    close_client = False

    if client is None:
        client = httpx.AsyncClient(timeout=10.0)
        close_client = True

    try:
        for attempt in range(1, max_retries + 1):
            try:
                response = await client.post(
                    settings.CLOUD_SYNC_ENDPOINT,
                    json=batch_request.model_dump(mode="json"),
                    headers=headers,
                )

                if response.status_code == 200:
                    batch_response = SyncBatchResponse.model_validate(response.json())
                    accepted_ids = [
                        res.transaction_id
                        for res in batch_response.results
                        if res.status == "accepted"
                    ]

                    if accepted_ids:
                        mark_logs_as_synced(session, accepted_ids, logs_objs=logs)

                    logger.info(
                        f"Campus sync batch push success: {batch_response.synced_count} accepted, {batch_response.error_count} errors"
                    )
                    return batch_response.synced_count

                logger.warning(
                    f"Campus sync HTTP {response.status_code} on attempt {attempt}/{max_retries}: {response.text}"
                )

            except (httpx.RequestError, Exception) as e:
                logger.warning(
                    f"Campus sync connection error on attempt {attempt}/{max_retries}: {e}"
                )

            if attempt < max_retries:
                sleep_duration = 0.5 * (2 ** (attempt - 1))
                await asyncio.sleep(sleep_duration)

    finally:
        if close_client:
            await client.aclose()

    return 0


async def run_campus_sync_loop(stop_event: Optional[asyncio.Event] = None) -> None:
    """
    Periodic non-blocking background loop for campus node sync.
    Runs continuously if CAMPUS_MODE is enabled.
    """
    logger.info("Campus sync loop started.")
    async_client = httpx.AsyncClient(timeout=10.0)

    try:
        while True:
            if stop_event and stop_event.is_set():
                break

            if settings.CAMPUS_MODE:
                try:
                    session_gen = get_session()
                    session = next(session_gen)
                    try:
                        await push_campus_batch_to_cloud_async(session, client=async_client)
                    finally:
                        session.close()
                except Exception as exc:
                    logger.error(f"Unexpected error in campus sync loop: {exc}")

            try:
                await asyncio.sleep(settings.CAMPUS_SYNC_INTERVAL_SECONDS)
            except asyncio.CancelledError:
                break
    finally:
        await async_client.aclose()
        logger.info("Campus sync loop stopped.")
