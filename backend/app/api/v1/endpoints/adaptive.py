"""Adaptive learning engine recommendations, diagnostic reports, and ML prediction endpoints."""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.schemas.adaptive import (
    AdaptiveRecommendationResponse,
    LearnerMasteryOverview,
    WeakConceptItem,
)
from app.services.adaptive_engine import AdaptiveEngine
from app.ml.predictor import MasteryPredictor


router = APIRouter()


@router.get("/next-activity", response_model=AdaptiveRecommendationResponse, summary="Get next adaptive recommendation")
def get_next_recommended_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Generate next optimal learning activity with transparent human-readable reasoning."""
    return AdaptiveEngine.select_next_activity(db, user_id=current_user.id)


@router.get("/weak-concepts", response_model=List[WeakConceptItem], summary="Get diagnosed weak concepts")
def get_weak_concepts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve concepts identified by the engine as having elevated error rates or low mastery."""
    return AdaptiveEngine.identify_weak_concepts(db, user_id=current_user.id)


@router.get("/overview", response_model=LearnerMasteryOverview, summary="Get learner mastery analytics")
def get_mastery_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve comprehensive breakdown of mastered skills, in-progress concepts, and weak areas."""
    return AdaptiveEngine.get_learner_mastery_overview(db, user_id=current_user.id)


@router.post("/predict-mastery", summary="Predict mastery transition probability via ML or rule-based fallback")
def predict_mastery(
    features: Dict[str, Any] = Body(
        ...,
        examples=[{
            "historical_accuracy": 0.82,
            "prior_attempts_count": 4,
            "avg_time_per_question_sec": 48.5,
            "prerequisite_mastery_avg": 0.88,
            "difficulty_level": "intermediate",
            "consecutive_error_streak": 0,
        }],
    ),
    current_user: User = Depends(get_current_active_user),
):
    """Predict concept mastery probability using versioned ML pipeline with automatic rule-based fallback."""
    return MasteryPredictor.predict_mastery_probability(features)
