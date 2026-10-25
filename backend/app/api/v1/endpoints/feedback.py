"""Student Feedback and Issue Submission endpoints."""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.models.user import User
from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreateRequest, FeedbackResponse


logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED, summary="Submit learner feedback")
def submit_feedback(
    payload: FeedbackCreateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Allows authenticated learners to submit feedback, bug reports, or content suggestions."""
    feedback = Feedback(
        user_id=current_user.id,
        category=payload.category,
        title=payload.title,
        message=payload.message,
        status="pending",
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    logger.info("Feedback #%d submitted by User #%d [%s]", feedback.id, current_user.id, payload.category)
    return feedback


@router.get("/my-feedback", response_model=List[FeedbackResponse], summary="List caller's feedback history")
def list_my_feedback(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retrieve history of feedback items submitted by the authenticated student."""
    return (
        db.query(Feedback)
        .filter(Feedback.user_id == current_user.id)
        .order_by(Feedback.created_at.desc())
        .all()
    )
