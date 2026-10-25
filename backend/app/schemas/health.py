"""Pydantic DTO schemas for system health and diagnostics."""

from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Schema returned by the health check endpoint."""

    status: str = Field(..., description="Overall health status: 'healthy' or 'degraded'")
    environment: str = Field(..., description="Active runtime environment name")
    project_name: str = Field(..., description="Project name")
    version: str = Field(..., description="API Version")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="UTC timestamp of the check")
    database_connected: bool = Field(..., description="Whether the relational database responded to query")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Detailed diagnostic metrics")
