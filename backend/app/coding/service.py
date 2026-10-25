"""Coding Practice Service orchestrating problem discovery, submissions, evaluation, and tracking."""

import logging
import re
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.coding import CodingProblem, CodingSubmission
from app.coding.evaluator import CodingEvaluator


logger = logging.getLogger(__name__)


class CodingService:
    """Service handling coding problems, safe evaluations, and student progress."""

    @staticmethod
    def list_problems(
        db: Session,
        skill_slug: Optional[str] = None,
        difficulty: Optional[str] = None,
    ) -> List[CodingProblem]:
        query = db.query(CodingProblem)
        if skill_slug:
            query = query.filter(CodingProblem.skill_slug == skill_slug)
        if difficulty:
            query = query.filter(CodingProblem.difficulty == difficulty)
        return query.order_by(CodingProblem.id).all()

    @staticmethod
    def get_problem_by_slug(db: Session, slug: str) -> Optional[CodingProblem]:
        return db.query(CodingProblem).filter(CodingProblem.slug == slug).first()

    @staticmethod
    def get_problem_by_id(db: Session, problem_id: int) -> Optional[CodingProblem]:
        return db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()

    @staticmethod
    def extract_expected_func_name(starter_code: str) -> Optional[str]:
        """Extract primary function name from starter code template."""
        match = re.search(r"def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(", starter_code)
        if match:
            return match.group(1)
        return None

    @staticmethod
    def submit_solution(
        db: Session,
        user_id: int,
        problem_id: int,
        code: str,
    ) -> CodingSubmission:
        problem = db.query(CodingProblem).filter(CodingProblem.id == problem_id).first()
        if not problem:
            raise ValueError(f"Coding problem with ID {problem_id} not found.")

        # Determine expected function name from rubric or starter code
        expected_func = None
        if problem.rubric_json and isinstance(problem.rubric_json, dict):
            expected_func = problem.rubric_json.get("function_name")
        if not expected_func:
            expected_func = CodingService.extract_expected_func_name(problem.starter_code)

        test_cases = problem.test_cases_json or []

        # Safely evaluate without executing untrusted code directly on host
        eval_result = CodingEvaluator.evaluate_submission(
            code=code,
            test_cases=test_cases,
            expected_func_name=expected_func,
        )

        submission = CodingSubmission(
            user_id=user_id,
            problem_id=problem_id,
            submitted_code=code,
            status=eval_result.get("status", "failed"),
            tests_passed=eval_result.get("tests_passed", 0),
            total_tests=eval_result.get("total_tests", len(test_cases)),
            test_results_json=eval_result.get("test_results", []),
            static_analysis_feedback_json={
                "static_analysis": eval_result.get("static_analysis", {}),
                "error_message": eval_result.get("error_message"),
                "sandbox_status": eval_result.get("sandbox_status", "isolated_ast_analysis"),
            },
            execution_mode=eval_result.get("execution_mode", "safe_static_analysis"),
        )

        db.add(submission)
        db.commit()
        db.refresh(submission)
        return submission

    @staticmethod
    def get_user_submissions(
        db: Session,
        user_id: int,
        problem_id: Optional[int] = None,
    ) -> List[CodingSubmission]:
        query = db.query(CodingSubmission).filter(CodingSubmission.user_id == user_id)
        if problem_id is not None:
            query = query.filter(CodingSubmission.problem_id == problem_id)
        return query.order_by(desc(CodingSubmission.created_at)).all()

    @staticmethod
    def get_submission_by_id(
        db: Session,
        submission_id: int,
        user_id: int,
    ) -> Optional[CodingSubmission]:
        """Fetch submission ensuring ownership enforcement (no cross-user inspection)."""
        submission = db.query(CodingSubmission).filter(CodingSubmission.id == submission_id).first()
        if not submission:
            return None
        if submission.user_id != user_id:
            raise PermissionError("Access forbidden: you do not own this coding submission.")
        return submission

    @staticmethod
    def get_recommendations_based_on_mistakes(
        db: Session,
        user_id: int,
    ) -> List[Dict[str, Any]]:
        """Analyze past failed submissions and recommend targeted practice and concepts."""
        recent_submissions = (
            db.query(CodingSubmission)
            .filter(CodingSubmission.user_id == user_id)
            .order_by(desc(CodingSubmission.created_at))
            .limit(10)
            .all()
        )

        recommendations = []
        syntax_mistakes = 0
        failed_tests = 0
        problem_ids_failed = set()

        for sub in recent_submissions:
            if sub.status == "syntax_error":
                syntax_mistakes += 1
                problem_ids_failed.add(sub.problem_id)
            elif sub.status == "failed":
                failed_tests += 1
                problem_ids_failed.add(sub.problem_id)

        if syntax_mistakes > 0:
            recommendations.append({
                "type": "concept_review",
                "title": "Python Syntax & Indentation Essentials",
                "reason": f"Detected {syntax_mistakes} syntax errors in recent submissions. Reviewing block structure and syntax will help.",
                "action": "Open AI Tutor with topic 'Python syntax fundamentals'",
            })

        if failed_tests > 0:
            recommendations.append({
                "type": "algorithmic_practice",
                "title": "Edge Case & Boundary Testing",
                "reason": f"You had {failed_tests} submissions that failed test cases. Focus on empty inputs, single-element cases, and boundary constraints.",
                "action": "Review hints before submitting or test locally with edge values.",
            })

        return recommendations
