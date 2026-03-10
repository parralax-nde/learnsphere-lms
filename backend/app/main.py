"""LearnSphere LMS – FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.router import router as auth_router
from app.config import get_settings
from app.database import Base, engine
from app.models import user as _user_models  # noqa: F401 – ensures models are registered

settings = get_settings()

# Create all database tables on startup (no-op if they already exist).
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LearnSphere LMS API",
    version="0.1.0",
    description="Backend API for the LearnSphere Learning Management System.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/health", tags=["health"])
def health_check():
    """Simple liveness probe."""
    return {"status": "ok"}
