"""Pydantic schemas for Hands-On Projects and Student Progress."""

from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ProjectResponse(BaseModel):
    """Detailed template for a real-world hands-on project."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    difficulty: str
    rubric_json: Any
    milestones_json: Any
    recommended_skills_json: Optional[Any] = None
    career_id: Optional[int] = None
    is_enrolled: bool = False
    current_status: Optional[str] = None
    current_completion: float = 0.0


class ProjectProgressUpdateRequest(BaseModel):
    """Payload to advance or complete a project."""
    status: str = Field(..., pattern="^(in_progress|submitted|completed)$")
    completion_percentage: float = Field(..., ge=0.0, le=100.0)
    evidence_notes: Optional[str] = None


class StudentProjectProgressResponse(BaseModel):
    """Student's enrollment and delivery progress for a project."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    project_title: str
    difficulty: str
    status: str
    completion_percentage: float
    evidence_notes: Optional[str] = None
    submitted_at: Optional[datetime] = None
    updated_at: datetime
