"""Pydantic schemas for Career Intelligence, Gap Analysis, and Roadmaps."""

from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field


CAREER_DISCLAIMER = (
    "Career readiness scores and roadmap milestones are generated based on platform "
    "assessment records and standardized industry curricula. SkillBridge AI does not "
    "guarantee job placement, interview offers, or specific compensation outcomes."
)


class CareerRequirementItem(BaseModel):
    """Specific skill required for a career path."""
    model_config = ConfigDict(from_attributes=True)

    skill_id: int
    skill_slug: str
    skill_title: str
    category: str
    minimum_mastery_level: float
    weight: float
    current_mastery: float = 0.0
    gap: float = 0.0
    is_satisfied: bool = False


class CareerBase(BaseModel):
    """Base career pathway attributes."""
    slug: str
    title: str
    description: Optional[str] = None
    average_salary_range: Optional[str] = None
    industry: Optional[str] = None


class CareerResponse(CareerBase):
    """Full career pathway with required skills."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    requirements: List[CareerRequirementItem] = []


class CareerGapAnalysisResponse(BaseModel):
    """Comparative readiness breakdown between learner mastery and target role requirements."""
    career_id: int
    career_slug: str
    career_title: str
    overall_readiness_percentage: float  # 0.0 to 100.0
    skills_analyzed_count: int
    skills_met_count: int
    top_skill_gaps: List[CareerRequirementItem]
    strengths: List[CareerRequirementItem]
    recommended_project_titles: List[str]
    disclaimer: str = CAREER_DISCLAIMER


class RoadmapMilestone(BaseModel):
    """Structured milestone in a 30/60/90 day plan."""
    period: str  # e.g., "Days 1-30", "Month 1", etc.
    focus_area: str
    target_skills: List[str]
    action_items: List[str]
    milestone_project: Optional[str] = None
    completed: bool = False


class RoadmapGenerateRequest(BaseModel):
    """Request payload to customize or regenerate a career roadmap."""
    plan_type: str = Field("90_day", pattern="^(30_day|60_day|90_day)$")


class RoadmapResponse(BaseModel):
    """Actionable progressive roadmap toward career readiness."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    career_id: Optional[int] = None
    career_title: str
    title: str
    plan_type: str
    milestones: List[RoadmapMilestone]
    completion_percentage: float
    created_at: datetime
    disclaimer: str = CAREER_DISCLAIMER
