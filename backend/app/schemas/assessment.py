"""Pydantic schemas for Assessments, Questions, Attempts, and Scoring."""

from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class QuestionPublicResponse(BaseModel):
    """Public question format delivered during an active test session without answer keys."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    assessment_id: int
    prompt: str
    question_type: str
    options_json: Any
    difficulty: str
    points: int


class AssessmentResponse(BaseModel):
    """Overview metadata for an assessment."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    skill_id: int
    skill_slug: Optional[str] = None
    skill_title: Optional[str] = None
    assessment_type: str
    pass_percentage: float
    time_limit_minutes: Optional[int] = None
    question_count: int = 0


class AssessmentStartResponse(BaseModel):
    """Payload returned when a student initiates an assessment attempt."""
    attempt_id: int
    assessment_id: int
    title: str
    time_limit_minutes: Optional[int] = None
    started_at: datetime
    questions: List[QuestionPublicResponse]


class QuestionSubmission(BaseModel):
    """Individual question answer submitted by the learner."""
    question_id: int
    learner_response_json: Any  # e.g. "Tuple" or 2
    time_spent_seconds: int = Field(default=0, ge=0)


class AssessmentSubmissionRequest(BaseModel):
    """Complete attempt submission payload."""
    responses: List[QuestionSubmission]


class QuestionResult(BaseModel):
    """Diagnostic outcome for a single question post-grading."""
    question_id: int
    prompt: str
    options_json: Any
    learner_response_json: Any
    correct_answer_json: Any
    is_correct: bool
    explanation: Optional[str] = None
    points_earned: int
    points_possible: int


class AssessmentSubmissionResult(BaseModel):
    """Server-side scored result returned immediately after submission."""
    attempt_id: int
    assessment_id: int
    assessment_title: str
    score_achieved: float  # Percentage 0.0 - 100.0
    is_passed: bool
    total_points_possible: int
    total_points_earned: int
    completed_at: datetime
    question_results: List[QuestionResult]
    adaptive_feedback: str


class AssessmentAttemptSummary(BaseModel):
    """Summary of past assessment attempts for learner history."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    assessment_id: int
    assessment_title: str
    skill_title: str
    score_achieved: float
    is_passed: bool
    started_at: datetime
    completed_at: Optional[datetime] = None
