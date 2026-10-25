"""Coding Practice endpoints providing safe static analysis, evaluation, and mistake-based recommendations."""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.coding import CodingProblem, CodingSubmission
from app.schemas.coding import (
    CodingProblemResponse,
    CodingProblemDetailResponse,
    TestCasePublicSchema,
    CodingSubmissionRequest,
    CodingSubmissionResponse,
    CodingRecommendationResponse,
)
from app.coding.service import CodingService


logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/problems", response_model=List[CodingProblemResponse], summary="List available coding problems")
def list_problems(
    skill_slug: Optional[str] = Query(None, description="Filter by skill slug"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty level: easy, medium, hard"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve catalog of algorithmic and programming practice problems."""
    return CodingService.list_problems(db, skill_slug=skill_slug, difficulty=difficulty)


@router.get("/problems/{slug}", response_model=CodingProblemDetailResponse, summary="Get problem details")
def get_problem(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get coding problem specification with starter code, progressive hints, and sample test cases."""
    problem = CodingService.get_problem_by_slug(db, slug)
    if not problem:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Coding problem '{slug}' not found.")

    # Filter out hidden test cases for student view
    raw_cases = problem.test_cases_json or []
    public_cases = [
        TestCasePublicSchema(input=c.get("input"), expected_output=c.get("expected_output"))
        for c in raw_cases
        if not c.get("is_hidden", False)
    ]

    return CodingProblemDetailResponse(
        id=problem.id,
        slug=problem.slug,
        title=problem.title,
        description=problem.description,
        difficulty=problem.difficulty,
        skill_slug=problem.skill_slug,
        starter_code=problem.starter_code,
        created_at=problem.created_at,
        public_test_cases=public_cases,
        hints=problem.hints_json or [],
    )


@router.post("/problems/{problem_id}/submit", response_model=CodingSubmissionResponse, summary="Submit code solution")
def submit_solution(
    problem_id: int,
    payload: CodingSubmissionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Safely evaluate student submission using AST security scanning and isolated static analysis."""
    try:
        submission = CodingService.submit_solution(
            db=db,
            user_id=current_user.id,
            problem_id=problem_id,
            code=payload.submitted_code,
        )
        return submission
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(val_err))
    except Exception as exc:
        logger.error("Failed to evaluate coding submission: %s", exc, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Submission evaluation failed: {exc}")


@router.get("/my-submissions", response_model=List[CodingSubmissionResponse], summary="List user's coding submissions")
def list_my_submissions(
    problem_id: Optional[int] = Query(None, description="Optional problem ID filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve history of coding attempts strictly scoped to the authenticated student."""
    return CodingService.get_user_submissions(db, user_id=current_user.id, problem_id=problem_id)


@router.get("/submissions/{submission_id}", response_model=CodingSubmissionResponse, summary="Get submission details")
def get_submission_detail(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve a single submission with strict cross-user ownership verification."""
    try:
        submission = CodingService.get_submission_by_id(db, submission_id=submission_id, user_id=current_user.id)
    except PermissionError as perm_err:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(perm_err))

    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Submission #{submission_id} not found.")

    return submission


@router.get("/recommendations", response_model=List[CodingRecommendationResponse], summary="Get mistake-based recommendations")
def get_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Generate targeted practice and concept suggestions derived from recent submission mistakes."""
    return CodingService.get_recommendations_based_on_mistakes(db, user_id=current_user.id)
