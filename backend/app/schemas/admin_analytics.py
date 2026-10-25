"""Pydantic schemas for Admin Learning Analytics and Audit Logs."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class UserMetrics(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    students_count: int
    instructors_count: int
    admins_count: int


class AssessmentMetrics(BaseModel):
    total_assessments: int
    total_attempts: int
    passed_attempts: int
    pass_rate_percentage: float
    average_score: float
    is_insufficient_data: bool


class SkillStruggleItem(BaseModel):
    skill_slug: str
    skill_title: str
    average_mastery: float
    learners_struggling_count: int


class SkillMasteredItem(BaseModel):
    skill_slug: str
    skill_title: str
    average_mastery: float
    learners_mastered_count: int


class SkillMetrics(BaseModel):
    total_skills: int
    total_mastery_records: int
    average_mastery_score: float
    top_struggling_skills: List[SkillStruggleItem] = []
    top_mastered_skills: List[SkillMasteredItem] = []
    is_insufficient_data: bool


class CareerMetrics(BaseModel):
    total_careers: int
    total_roadmaps_generated: int
    is_insufficient_data: bool


class ContentMetrics(BaseModel):
    total_projects: int
    approved_documents: int
    indexed_chunks: int
    coding_problems: int


class ActivityMetrics(BaseModel):
    total_learner_activities: int
    recent_activities_count: int
    activities_by_type: Dict[str, int] = {}


class AIModelMetrics(BaseModel):
    ai_provider: str
    is_live_llm: bool
    fallback_engine_available: bool
    rate_limit_per_user: int


class AdminAnalyticsResponse(BaseModel):
    """Holistic learning analytics reporting platform engagement, comprehension, and telemetry."""
    user_metrics: UserMetrics
    assessment_metrics: AssessmentMetrics
    skill_metrics: SkillMetrics
    career_metrics: CareerMetrics
    content_metrics: ContentMetrics
    activity_metrics: ActivityMetrics
    ai_metrics: AIModelMetrics
    generated_at: datetime


class AdminAuditLogResponse(BaseModel):
    """Public representation of an administrative audit trail record."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    admin_id: int
    admin_email: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details_json: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime


class AdminAuditLogListResponse(BaseModel):
    """Paginated collection of audit logs."""
    items: List[AdminAuditLogResponse]
    total: int
    skip: int
    limit: int
