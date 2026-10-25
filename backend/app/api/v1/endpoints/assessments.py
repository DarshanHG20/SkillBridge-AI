"""Assessment and Question Bank API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.schemas.assessment import (
    AssessmentResponse,
    AssessmentStartResponse,
    AssessmentSubmissionRequest,
    AssessmentSubmissionResult,
    AssessmentAttemptSummary,
)
from app.services.assessment_service import AssessmentService


router = APIRouter()


@router.get("", response_model=List[AssessmentResponse], summary="List available assessments")
def list_assessments(
    skill_id: Optional[int] = Query(None, description="Filter by skill ID"),
    db: Session = Depends(get_db),
):
    """Retrieve catalog of diagnostic and formative assessments."""
    return AssessmentService.list_assessments(db, skill_id=skill_id)


@router.post("/{assessment_id}/start", response_model=AssessmentStartResponse, summary="Start an assessment session")
def start_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Initialize a student assessment session and deliver questions with answers stripped."""
    return AssessmentService.start_assessment(db, user_id=current_user.id, assessment_id=assessment_id)


@router.post("/attempts/{attempt_id}/submit", response_model=AssessmentSubmissionResult, summary="Submit assessment answers")
def submit_assessment(
    attempt_id: int,
    payload: AssessmentSubmissionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Grade responses server-side, prevent duplicate submissions, and trigger adaptive mastery updates."""
    return AssessmentService.submit_assessment(
        db=db,
        user_id=current_user.id,
        attempt_id=attempt_id,
        payload=payload,
    )


@router.get("/attempts/{attempt_id}", response_model=AssessmentSubmissionResult, summary="Get scored attempt results")
def get_attempt_results(
    attempt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve completed attempt results with per-question explanations and student ownership validation."""
    return AssessmentService.get_attempt_details(
        db=db,
        user_id=current_user.id,
        attempt_id=attempt_id,
    )


@router.get("/my-history", response_model=List[AssessmentAttemptSummary], summary="Get learner assessment history")
def get_attempt_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve chronologically ordered assessment attempts for the authenticated student."""
    return AssessmentService.get_user_attempt_history(db, user_id=current_user.id)
