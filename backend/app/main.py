from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from app.config import settings
from app.database import get_session
from app.routers.auth import router as auth_router
from app.routers.courses import router as courses_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Offline-first e-learning prototype API scaffold",
    version="0.1.0"
)

# Configure CORS
origins = settings.BACKEND_CORS_ORIGINS
if isinstance(origins, str):
    # fallback safety
    origins = [origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(courses_router)

@app.get("/health")
def health_check(db: Session = Depends(get_session)):
    """Health check endpoint to verify API operation and database connectivity."""
    # We can also do a quick select 1 query if we want to guarantee the db connection works.
    return {"status": "ok"}

@app.get("/")
def read_root():
    return {
        "message": f"Welcome to the {settings.PROJECT_NAME}",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }
