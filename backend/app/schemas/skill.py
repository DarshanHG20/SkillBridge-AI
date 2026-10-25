"""Pydantic schemas for Skills, Prerequisites, and Skill Mastery."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SkillBase(BaseModel):
    """Base attributes for a skill."""
    slug: str = Field(..., max_length=100)
    title: str = Field(..., max_length=150)
    category: str = Field(..., max_length=100)
    description: Optional[str] = None
    difficulty_level: str = Field("beginner", pattern="^(beginner|intermediate|advanced)$")


class SkillCreate(SkillBase):
    """Schema for skill creation."""
    pass


class SkillResponse(SkillBase):
    """Complete public representation of a skill."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SkillPrerequisiteResponse(BaseModel):
    """Schema for a prerequisite edge."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    skill_id: int
    prerequisite_skill_id: int
    requirement_type: str
    prerequisite_slug: Optional[str] = None
    prerequisite_title: Optional[str] = None


class SkillTaxonomyNode(BaseModel):
    """Rich hierarchical taxonomy node for visualization and navigation."""
    id: int
    slug: str
    title: str
    category: str
    description: Optional[str] = None
    difficulty_level: str
    prerequisite_slugs: List[str] = []
    dependent_slugs: List[str] = []
    current_mastery: float = 0.0
    status: str = "unlocked"  # 'locked', 'unlocked', 'in_progress', 'mastered'


class SkillMasteryResponse(BaseModel):
    """Learner's current mastery state for a specific skill."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    skill_id: int
    skill_slug: str
    skill_title: str
    category: str
    difficulty_level: str
    mastery_score: float
    confidence_score: float
    status: str
    last_practiced_at: Optional[datetime] = None
