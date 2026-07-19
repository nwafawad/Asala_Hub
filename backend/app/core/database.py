"""
Database Module.

Initializes the SQLModel database engine and connection pool parameters,
and provides a session manager dependency for executing database transactions.
"""

from sqlmodel import create_engine, Session
from app.core.config import settings

# Initialize database engine with performance settings
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.ECHO_SQL,
    pool_size=settings.POOL_SIZE,
    max_overflow=settings.MAX_OVERFLOW,
    pool_recycle=settings.POOL_RECYCLE,
    pool_timeout=settings.POOL_TIMEOUT
)

def get_session():
    """
    Dependency generator to yield database sessions.
    Automatically handles session creation, injection, and disposal.
    """
    with Session(engine) as session:
        yield session

