"""
HTTP Middleware and CORS Setup.

Provides request latency logging, OWASP security header injection,
and CORS origin management.
"""

import time
import logging
from typing import List
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

logger = logging.getLogger("asala_hub")


import gzip

async def gzip_request_decompression_middleware(request: Request, call_next):
    """
    Middleware: Decompress gzipped incoming request bodies when Content-Encoding: gzip is present.
    Allows endpoints like POST /sync to accept gzipped payloads seamlessly.
    """
    content_encoding = request.headers.get("content-encoding", "").lower()
    if "gzip" in content_encoding:
        try:
            body = await request.body()
            if body:
                decompressed_body = gzip.decompress(body)
                request._body = decompressed_body

                async def receive():
                    return {
                        "type": "http.request",
                        "body": decompressed_body,
                        "more_body": False,
                    }

                request._receive = receive
        except Exception as exc:
            logger.error(f"Failed to decompress gzipped request body: {exc}")

    return await call_next(request)




async def security_and_logging_middleware(request: Request, call_next):
    """
    HTTP Middleware:
    1. Measures request processing latency.
    2. Logs incoming HTTP request methods, paths, status codes, and execution times.
    3. Injects standard OWASP security headers into all outgoing HTTP responses.
    """
    start_time = time.time()
    response: Response = await call_next(request)
    process_time = (time.time() - start_time) * 1000

    # Inject OWASP recommended security headers
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    logger.info(f"[{request.method}] {request.url.path} -> {response.status_code} ({process_time:.2f}ms)")
    return response



def setup_cors(app: FastAPI) -> None:
    """
    Configure CORS middleware on the FastAPI application instance.
    """
    origins: List[str] = list(settings.allowed_hosts_list)
    if not origins:
        origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    origins = list(set(origins))  # Remove duplicate origins

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
