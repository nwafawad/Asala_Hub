from sqlmodel import create_engine, Session
from app.config import settings

# engine configured from settings.DATABASE_URL
engine = create_engine(settings.DATABASE_URL, echo=True)

def get_session():
    """Dependency to obtain database session."""
    with Session(engine) as session:
        yield session
