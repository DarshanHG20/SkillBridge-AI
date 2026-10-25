"""Main entrypoint for the SkillBridge AI FastAPI Application."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.database import Base, engine

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager for startup and shutdown events."""
    # Create tables automatically for SQLite / local development if not using Alembic
    if settings.DATABASE_URL.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=__version__,
    description=(
        "Adaptive AI learning backend for SkillBridge AI. Powers personal learning paths, "
        "knowledge-graph mastery modeling, diagnostic assessments, and cross-platform telemetry."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS)
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/", summary="Root Index", tags=["General"])
def root_index() -> JSONResponse:
    """Root health and discovery endpoint."""
    return JSONResponse(
        content={
            "service": settings.PROJECT_NAME,
            "version": __version__,
            "status": "operational",
            "documentation": "/docs",
            "api_v1": settings.API_V1_STR,
            "health_check": f"{settings.API_V1_STR}/health",
        }
    )


# Mount versioned API router
app.include_router(api_router, prefix=settings.API_V1_STR)
