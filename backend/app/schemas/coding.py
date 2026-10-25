"""Pydantic schemas for Coding Practice problems, test cases, and submissions."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class TestCasePublicSchema(BaseModel):
    """Publicly visible sample test case."""
    input: Any
    expected_output: Any


class TestCaseResultSchema(BaseModel):
    """Result of running a test case."""
    test_index: int
    input: Any
    expected_output: Any
    actual_output: Any
    passed: bool
    error: Optional[str] = None


class CodingProblemBase(BaseModel):
    slug: str
    title: str
    description: str
    difficulty: str
    skill_slug: str
    starter_code: str


class CodingProblemResponse(CodingProblemBase):
    """Brief problem summary for lists."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class CodingProblemDetailResponse(CodingProblemResponse):
    """Detailed problem description with public test cases and progressive hints."""
    public_test_cases: List[TestCasePublicSchema] = []
    hints: List[str] = []


class CodingSubmissionRequest(BaseModel):
    """Student code submitted for grading."""
    submitted_code: str = Field(..., min_length=1, max_length=50000)


class CodingSubmissionResponse(BaseModel):
    """Graded submission result with static analysis and test outcomes."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    problem_id: int
    submitted_code: str
    status: str
    tests_passed: int
    total_tests: int
    test_results_json: Optional[List[Dict[str, Any]]] = None
    static_analysis_feedback_json: Optional[Dict[str, Any]] = None
    execution_mode: str
    created_at: datetime


class CodingRecommendationResponse(BaseModel):
    """Personalized remedial suggestion based on past coding mistakes."""
    type: str
    title: str
    reason: str
    action: str
