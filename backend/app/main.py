from __future__ import annotations

import time
import logging
from fastapi import FastAPI, Depends, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, text, select
from app.core.config import settings
from app.core.database import get_session
from app.routers import auth, courses, modules, assignments, sync


logger = logging.getLogger("asala_hub")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

app = FastAPI(
    title="Asala Hub API",
    description="Offline-first e-learning PWA Backend Services",
    version="0.1.0"
)

# Request latency, logging, and OWASP security headers middleware
@app.middleware("http")
async def log_requests_and_security_headers_middleware(request: Request, call_next):
    start_time = time.time()
    response: Response = await call_next(request)
    process_time = (time.time() - start_time) * 1000

    # Inject OWASP security headers
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    logger.info(f"[{request.method}] {request.url.path} -> {response.status_code} ({process_time:.2f}ms)")
    return response



# CORS configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
origins.extend(settings.allowed_hosts_list)
origins = list(set(origins))  # Remove duplicates

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/healthz")
def healthz_check(response: Response, session: Session = Depends(get_session)):
    """
    Diagnostic health check verifying DB connection pool readiness.
    """
    try:
        session.exec(select(1))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check DB failure: {e}")
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "error", "database": "disconnected", "detail": str(e)}

# Include routers
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(modules.router)
app.include_router(assignments.router)
app.include_router(sync.router)
