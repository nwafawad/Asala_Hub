"""
Backup Health & Stale Alert Test Suite.

Tests /healthz endpoint backup status monitoring, missing status file handling,
fresh backup status (<24h), and stale backup alert logging (>24h).
"""

import json
import os
import tempfile
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient

from app.core.config import settings


def test_healthz_missing_backup(client: TestClient, monkeypatch):
    """Test /healthz response when backup metadata file does not exist."""
    monkeypatch.setattr(settings, "BACKUP_STATUS_FILE", "/tmp/non_existent_backup_status_12345.json")

    res = client.get("/healthz")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"
    assert data["last_backup"]["status"] == "missing"
    assert data["last_backup"]["stale"] is True


def test_healthz_fresh_backup(client: TestClient, monkeypatch):
    """Test /healthz response when a fresh backup (<24h old) exists."""
    with tempfile.NamedTemporaryFile(mode="w+", suffix=".json", delete=False) as tmp:
        fresh_time = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        json.dump({"status": "success", "timestamp": fresh_time, "size_bytes": 2048}, tmp)
        tmp_path = tmp.name

    try:
        monkeypatch.setattr(settings, "BACKUP_STATUS_FILE", tmp_path)
        res = client.get("/healthz")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["database"] == "connected"
        assert data["last_backup"]["status"] == "ok"
        assert data["last_backup"]["stale"] is False
        assert 1.5 <= data["last_backup"]["age_hours"] <= 2.5
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


def test_healthz_stale_backup_alert(client: TestClient, monkeypatch, caplog):
    """Test /healthz response and log warning alert when backup is stale (>24h old)."""
    with tempfile.NamedTemporaryFile(mode="w+", suffix=".json", delete=False) as tmp:
        stale_time = (datetime.now(timezone.utc) - timedelta(hours=30)).isoformat()
        json.dump({"status": "success", "timestamp": stale_time, "size_bytes": 4096}, tmp)
        tmp_path = tmp.name

    try:
        monkeypatch.setattr(settings, "BACKUP_STATUS_FILE", tmp_path)
        res = client.get("/healthz")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["last_backup"]["status"] == "stale"
        assert data["last_backup"]["stale"] is True
        assert data["last_backup"]["age_hours"] >= 29.0

        # Verify stale log alert
        assert "HEALTH ALERT: Database backup is stale!" in caplog.text
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
