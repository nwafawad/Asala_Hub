from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import auth, courses, modules, sync

app = FastAPI(
    title="Asala Hub API",
    description="Offline-first e-learning PWA Backend Services",
    version="0.1.0"
)

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if settings.ALLOWED_HOSTS:
    hosts = [h.strip() for h in settings.ALLOWED_HOSTS.split(",") if h.strip()]
    origins.extend(hosts)
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

# Include routers
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(modules.router)
app.include_router(sync.router)
