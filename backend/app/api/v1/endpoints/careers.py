"""Career Intelligence, Gap Analysis, and Roadmap generation endpoints."""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.career import Roadmap, Career
from app.schemas.career import (
    CareerResponse,
    CareerGapAnalysisResponse,
    RoadmapResponse,
    RoadmapGenerateRequest,
    RoadmapMilestone,
    CAREER_DISCLAIMER,
)
from app.services.career_service import CareerService


router = APIRouter()


@router.get("", response_model=List[CareerResponse], summary="List all career pathways")
def list_careers(
    db: Session = Depends(get_db),
):
    """Retrieve catalog of configurable career paths and skill requirements."""
    return CareerService.list_careers(db)


@router.get("/{slug}", response_model=CareerResponse, summary="Get career path details")
def get_career_details(
    slug: str,
    db: Session = Depends(get_db),
):
    """Retrieve single career pathway definition and required competencies."""
    career = CareerService.get_career_by_slug(db, slug)
    all_careers = CareerService.list_careers(db)
    matched = next((c for c in all_careers if c.id == career.id), None)
    return matched or career


@router.get("/{slug}/gap-analysis", response_model=CareerGapAnalysisResponse, summary="Analyze career skill gaps")
def analyze_career_gap(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Calculate career readiness score and identify prioritized skill gaps against benchmark requirements."""
    return CareerService.analyze_career_gap(
        db=db,
        user_id=current_user.id,
        career_slug=slug,
    )


@router.post("/{slug}/generate-roadmap", response_model=RoadmapResponse, summary="Generate personalized 30/60/90-day roadmap")
def generate_career_roadmap(
    slug: str,
    payload: RoadmapGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Generate or update actionable milestone roadmap addressing learner's specific career gaps."""
    return CareerService.generate_roadmap(
        db=db,
        user_id=current_user.id,
        career_slug=slug,
        plan_type=payload.plan_type,
    )


@router.get("/my-roadmaps/all", response_model=List[RoadmapResponse], summary="Get learner's saved roadmaps")
def get_my_roadmaps(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve all customized roadmaps created for the authenticated student."""
    roadmaps = (
        db.query(Roadmap, Career)
        .outerjoin(Career, Roadmap.career_id == Career.id)
        .filter(Roadmap.user_id == current_user.id)
        .order_by(Roadmap.created_at.desc())
        .all()
    )

    results: List[RoadmapResponse] = []
    for r, c in roadmaps:
        milestones = [RoadmapMilestone(**m) for m in (r.milestones_json or [])]
        results.append(
            RoadmapResponse(
                id=r.id,
                career_id=r.career_id,
                career_title=c.title if c else "Custom Pathway",
                title=r.title,
                plan_type=r.plan_type,
                milestones=milestones,
                completion_percentage=r.completion_percentage,
                created_at=r.created_at,
                disclaimer=CAREER_DISCLAIMER,
            )
        )
    return results
