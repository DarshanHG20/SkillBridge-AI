"""Health check and system telemetry endpoint."""

from fastapi import APIRouter, status
from app import __version__
from app.core.config import get_settings
from app.core.database import check_database_connection
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Service Health Check",
    description="Returns service availability, active environment, and database connectivity.",
)
def get_health() -> HealthResponse:
    """Perform health evaluation and return status payload."""
    settings = get_settings()
    is_db_ok = check_database_connection()

    overall_status = "healthy" if is_db_ok else "degraded"

    return HealthResponse(
        status=overall_status,
        environment=settings.ENVIRONMENT,
        project_name=settings.PROJECT_NAME,
        version=__version__,
        database_connected=is_db_ok,
        details={
            "debug": settings.DEBUG,
            "adaptive_engine_enabled": settings.AI_ADAPTIVE_ENGINE_ENABLED,
            "api_version": settings.API_V1_STR,
        },
    )
