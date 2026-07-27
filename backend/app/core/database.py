"""
Database Module.

Initializes the SQLModel database engine and connection pool parameters,
and provides a session manager dependency for executing database transactions.
"""

from typing import Any
from sqlmodel import create_engine, Session
from app.core.config import settings

is_sqlite = settings.DATABASE_URL.startswith("sqlite")
engine_kwargs: dict[str, Any] = {
    "echo": settings.ECHO_SQL,
}

if is_sqlite:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs.update({
        "pool_size": settings.POOL_SIZE,
        "max_overflow": settings.MAX_OVERFLOW,
        "pool_recycle": settings.POOL_RECYCLE,
        "pool_timeout": settings.POOL_TIMEOUT,
        "pool_pre_ping": settings.POOL_PRE_PING,
    })

# Initialize database engine
engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

def get_session():
    """
    Dependency generator to yield database sessions.
    Automatically handles session creation, injection, and disposal.
    """
    with Session(engine) as session:
        yield session


