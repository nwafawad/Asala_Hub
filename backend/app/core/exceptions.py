"""
Application Exceptions and Error Handlers.

Provides custom domain exception classes and FastAPI exception handlers
to ensure consistent JSON error responses across all API endpoints.
"""

from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse


class DomainException(Exception):
    """Base class for all application domain exceptions."""

    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class ResourceNotFoundError(DomainException):
    """Raised when a requested resource does not exist in the database."""

    def __init__(self, resource_name: str = "Resource", resource_id: Optional[Any] = None):
        message = f"{resource_name} not found"
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND)


class PermissionDeniedError(DomainException):
    """Raised when an authenticated user lacks permission to access or modify a resource."""

    def __init__(self, message: str = "You do not have permission to perform this action"):
        super().__init__(message=message, status_code=status.HTTP_403_FORBIDDEN)


class ResourceConflictError(DomainException):
    """Raised when a resource state conflict occurs (e.g. duplicate email, version conflict)."""

    def __init__(self, message: str = "Resource conflict occurred"):
        super().__init__(message=message, status_code=status.HTTP_409_CONFLICT)


class AuthenticationError(DomainException):
    """Raised when authentication credentials are invalid or missing."""

    def __init__(self, message: str = "Could not validate credentials"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details={"headers": {"WWW-Authenticate": "Bearer"}},
        )


async def domain_exception_handler(request: Request, exc: DomainException) -> JSONResponse:
    """FastAPI global exception handler for DomainException subclasses."""
    headers = exc.details.get("headers") if exc.details else None
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
        headers=headers,
    )
