"""Skill knowledge taxonomy and prerequisite DAG endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user, get_optional_current_user
from app.models.user import User
from app.models.skill import SkillMastery, Skill
from app.schemas.skill import SkillResponse, SkillTaxonomyNode, SkillMasteryResponse
from app.services.skill_service import SkillService


router = APIRouter()


@router.get("", response_model=List[SkillResponse], summary="List all skills")
def list_skills(
    category: Optional[str] = Query(None, description="Filter skills by domain category"),
    db: Session = Depends(get_db),
):
    """Retrieve all configurable skills across the 9 core technical domains."""
    return SkillService.get_all_skills(db, category=category)


@router.get("/taxonomy/tree", response_model=List[SkillTaxonomyNode], summary="Get full taxonomy DAG tree")
def get_taxonomy_tree(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Retrieve hierarchical skill taxonomy tree annotated with prerequisite edges and unlock states."""
    user_id = current_user.id if current_user else None
    return SkillService.get_taxonomy_tree(db, user_id=user_id)


@router.get("/my-mastery", response_model=List[SkillMasteryResponse], summary="Get student mastery scores")
def get_my_mastery(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve authenticated learner's mastery records across all practiced skills."""
    records = (
        db.query(SkillMastery, Skill)
        .join(Skill, SkillMastery.skill_id == Skill.id)
        .filter(SkillMastery.user_id == current_user.id)
        .order_by(Skill.category, Skill.title)
        .all()
    )

    return [
        SkillMasteryResponse(
            id=m.id,
            skill_id=m.skill_id,
            skill_slug=s.slug,
            skill_title=s.title,
            category=s.category,
            difficulty_level=s.difficulty_level,
            mastery_score=m.mastery_score,
            confidence_score=m.confidence_score,
            status=m.status,
            last_practiced_at=m.last_practiced_at,
        )
        for m, s in records
    ]


@router.get("/{slug}", response_model=SkillResponse, summary="Get skill details by slug")
def get_skill_by_slug(
    slug: str,
    db: Session = Depends(get_db),
):
    """Fetch individual skill details by unique slug."""
    return SkillService.get_skill_by_slug(db, slug=slug)
