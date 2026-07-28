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


# System Health Check Endpoints
@app.get("/health", tags=["system"])
def health_check():
    """Liveness check verifying server availability."""
    return {"status": "ok"}


@app.get("/healthz", tags=["system"])
def healthz_check(response: Response, session: Session = Depends(get_session)):
    """
    Readiness check verifying database connection pool health.
    """
    try:
        session.exec(select(1))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check DB failure: {e}")
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "error", "database": "disconnected", "detail": str(e)}


# Include feature routers
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(modules.router)
app.include_router(assignments.router)
app.include_router(sync.router)
app.include_router(admin.router)

