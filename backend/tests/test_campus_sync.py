"""
Campus Sync Service Test Suite.

Tests campus node batch payload generation, cloud sync push, local DB reconciliation,
exponential backoff retries on network failures, and end-to-end sync with the cloud engine.
"""

import uuid
from datetime import datetime, timezone
import httpx
import pytest
from sqlmodel import Session

from app.core.config import settings
from app.models import TransactionLog, SyncStatus
from app.models.base import get_naive_utc_now
from app.schemas.sync import SyncBatchResponse, SyncTransactionResult
from app.services.campus_sync_service import (
    get_unsynced_transaction_logs,
    build_sync_batch_request,
    push_campus_batch_to_cloud,
    get_effective_service_token,
)


def test_unsynced_transaction_logs_retrieval(session: Session, test_student):
    """Verify querying unsynced transaction logs from campus database."""
    log_id1 = uuid.uuid4()
    log_id2 = uuid.uuid4()
    now = get_naive_utc_now()

    # Log 1: Unsynced
    log1 = TransactionLog(
        id=log_id1,
        user_id=test_student.id,
        entity_type="submission",
        entity_id=uuid.uuid4(),
        payload={"action": "CREATE", "content": "Essay content 1"},
        schema_version=1,
        client_timestamp=now,
        synced_at=None,
    )
    # Log 2: Already synced
    log2 = TransactionLog(
        id=log_id2,
        user_id=test_student.id,
        entity_type="submission",
        entity_id=uuid.uuid4(),
        payload={"action": "CREATE", "content": "Essay content 2"},
        schema_version=1,
        client_timestamp=now,
        synced_at=now,
    )

    session.add(log1)
    session.add(log2)
    session.commit()

    unsynced = get_unsynced_transaction_logs(session)
    assert len(unsynced) == 1
    assert unsynced[0].id == log_id1


def test_campus_sync_push_success(session: Session, test_student):
    """Test successful push of campus batch to cloud endpoint and local DB reconciliation."""
    tx_id = uuid.uuid4()
    sub_id = uuid.uuid4()
    now = get_naive_utc_now()

    log = TransactionLog(
        id=tx_id,
        user_id=test_student.id,
        entity_type="submission",
        entity_id=sub_id,
        payload={"action": "CREATE", "content": "Campus essay submission"},
        schema_version=1,
        client_timestamp=now,
        synced_at=None,
    )
    session.add(log)
    session.commit()

    # Mock HTTP client returning 200 OK
    def mock_handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"].startswith("Bearer ")
        batch_res = SyncBatchResponse(
            results=[
                SyncTransactionResult(
                    transaction_id=tx_id,
                    status="accepted",
                    server_sequence=1001,
                    synced_at=now,
                    error=None,
                )
            ],
            synced_count=1,
            error_count=0,
        )
        return httpx.Response(200, json=batch_res.model_dump(mode="json"))

    mock_transport = httpx.MockTransport(mock_handler)
    mock_client = httpx.Client(transport=mock_transport)

    synced_count = push_campus_batch_to_cloud(session, client=mock_client)
    assert synced_count == 1

    # Verify local log updated with synced_at timestamp
    session.refresh(log)
    assert log.synced_at is not None


def test_campus_sync_retry_on_network_failure(session: Session, test_student, monkeypatch):
    """Test exponential backoff retries when encountering network connection errors."""
    monkeypatch.setattr(settings, "CAMPUS_SYNC_MAX_RETRIES", 3)

    tx_id = uuid.uuid4()
    now = get_naive_utc_now()

    log = TransactionLog(
        id=tx_id,
        user_id=test_student.id,
        entity_type="submission",
        entity_id=uuid.uuid4(),
        payload={"action": "CREATE", "content": "Retry test content"},
        schema_version=1,
        client_timestamp=now,
        synced_at=None,
    )
    session.add(log)
    session.commit()

    attempts = {"count": 0}

    def mock_handler(request: httpx.Request) -> httpx.Response:
        attempts["count"] += 1
        if attempts["count"] < 3:
            raise httpx.ConnectError("Cloud server unreachable")

        batch_res = SyncBatchResponse(
            results=[
                SyncTransactionResult(
                    transaction_id=tx_id,
                    status="accepted",
                    server_sequence=1002,
                    synced_at=now,
                )
            ],
            synced_count=1,
            error_count=0,
        )
        return httpx.Response(200, json=batch_res.model_dump(mode="json"))

    mock_transport = httpx.MockTransport(mock_handler)
    mock_client = httpx.Client(transport=mock_transport)

    synced_count = push_campus_batch_to_cloud(session, client=mock_client)
    assert attempts["count"] == 3
    assert synced_count == 1

    session.refresh(log)
    assert log.synced_at is not None


def test_campus_sync_end_to_end_with_cloud_router(client, session, test_student, admin_token_headers):
    """Test end-to-end integration pushing a campus batch directly to the FastAPI /sync endpoint."""
    tx_id = uuid.uuid4()
    sub_id = uuid.uuid4()
    now = get_naive_utc_now()

    log = TransactionLog(
        id=tx_id,
        user_id=test_student.id,
        entity_type="submission",
        entity_id=sub_id,
        payload={"action": "CREATE", "content": "End-to-end campus push", "version": 1},
        schema_version=1,
        client_timestamp=now,
        synced_at=None,
    )
    session.add(log)
    session.commit()

    # Route client requests directly through FastAPI TestClient
    import json

    def mock_handler(request: httpx.Request) -> httpx.Response:
        auth_header = admin_token_headers["Authorization"]
        payload = json.loads(request.content.decode("utf-8"))
        res = client.post("/sync", json=payload, headers={"Authorization": auth_header})
        return httpx.Response(res.status_code, json=res.json())


    mock_transport = httpx.MockTransport(mock_handler)
    mock_client = httpx.Client(transport=mock_transport)

    synced_count = push_campus_batch_to_cloud(session, client=mock_client)
    assert synced_count == 1

    session.refresh(log)
    assert log.synced_at is not None
