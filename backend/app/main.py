"""
Asala Hub API Gateway Entrypoint.

Initializes FastAPI application instance, mounts HTTP middleware, configures CORS,
registers global domain exception handlers, and mounts API routers.
"""

from __future__ import annotations

import logging
from fastapi import FastAPI, Depends, Response, status
from sqlmodel import Session, select

import asyncio
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.exceptions import DomainException, domain_exception_handler
from app.core.middleware import security_and_logging_middleware, setup_cors
from app.core.database import get_session
from app.routers import auth, courses, modules, assignments, sync, admin
from app.services.campus_sync_service import run_campus_sync_loop

# Configure system logger
logger = logging.getLogger("asala_hub")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    sync_task = None
    if settings.CAMPUS_MODE:
        logger.info("Initializing Campus Sync background service...")
        sync_task = asyncio.create_task(run_campus_sync_loop())
    yield
    if sync_task:
        sync_task.cancel()


app = FastAPI(
    title="Asala Hub API",
    description="Offline-first e-learning PWA Backend Services",
    version="0.1.0",
    lifespan=lifespan,
)


# Register custom domain exception handlers
app.add_exception_handler(DomainException, domain_exception_handler)

# Mount HTTP security headers and request latency middleware
app.middleware("http")(security_and_logging_middleware)

# Configure CORS origins
setup_cors(app)


import json
from datetime import datetime, timezone


def _check_backup_health() -> dict:
    """
    Check the status and age of the last database backup metadata file.
    Alerts via log warning if the backup is older than 24 hours or missing.
    """
    status_file = settings.BACKUP_STATUS_FILE
    if not os.path.exists(status_file):
        alt_file = os.path.join("/backups", "last_backup_status.json")
        if os.path.exists(alt_file):
            status_file = alt_file

    if not os.path.exists(status_file):
        logger.warning("HEALTH ALERT: Backup status metadata file is missing or not yet generated.")
        return {"status": "missing", "stale": True, "detail": "Backup status file not found"}

    try:
        with open(status_file, "r") as f:
            data = json.load(f)

        timestamp_str = data.get("timestamp")
        if not timestamp_str:
            logger.warning("HEALTH ALERT: Backup status file contains invalid or missing timestamp.")
            return {"status": "invalid", "stale": True}

        backup_dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        age_hours = round((now - backup_dt).total_seconds() / 3600.0, 2)
        stale = age_hours > 24.0

        if stale:
            logger.warning(
                f"HEALTH ALERT: Database backup is stale! Last successful backup was {age_hours} hours ago (threshold: 24h)."
            )
        else:
            logger.info(f"Database backup is fresh: last backup was {age_hours} hours ago.")

        return {
            "status": "stale" if stale else "ok",
            "timestamp": timestamp_str,
            "age_hours": age_hours,
            "stale": stale,
            "size_bytes": data.get("size_bytes"),
        }
    except Exception as exc:
        logger.error(f"Error checking backup health status: {exc}")
        return {"status": "error", "stale": True, "detail": str(exc)}


# System Health Check Endpoints
@app.get("/health", tags=["system"])
def health_check():
    """Liveness check verifying server availability."""
    return {"status": "ok"}


@app.get("/healthz", tags=["system"])
def healthz_check(response: Response, session: Session = Depends(get_session)):
    """
    Readiness check verifying database connection pool health and database backup freshness (<24h).
    """
    try:
        session.exec(select(1))
    except Exception as e:
        logger.error(f"Health check DB failure: {e}")
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "error", "database": "disconnected", "detail": str(e)}

    backup_info = _check_backup_health()
    return {
        "status": "ok",
        "database": "connected",
        "last_backup": backup_info,
    }



import os
from fastapi.staticfiles import StaticFiles

# Include feature routers
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(modules.router)
app.include_router(assignments.router)
app.include_router(sync.router)
app.include_router(admin.router)

# Mount media uploads directory for serving static media assets
uploads_dir = settings.MEDIA_UPLOAD_DIR
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


