"""Assessment service handling question banks, server-side grading, attempt lifecycle, and security."""

from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.assessment import Assessment, Question, AssessmentAttempt, AssessmentResponse
from app.models.skill import Skill
from app.schemas.assessment import (
    AssessmentResponse as AssessmentSchema,
    AssessmentStartResponse,
    AssessmentSubmissionRequest,
    AssessmentSubmissionResult,
    QuestionPublicResponse,
    QuestionResult,
    AssessmentAttemptSummary,
)
from app.services.adaptive_engine import AdaptiveEngine


class AssessmentService:
    """Service encapsulating assessment sessions, server-side grading, and diagnostic feedback."""

    @staticmethod
    def list_assessments(db: Session, skill_id: Optional[int] = None) -> List[AssessmentSchema]:
        """List active assessments with question counts and skill associations."""
        query = db.query(Assessment)
        if skill_id:
            query = query.filter(Assessment.skill_id == skill_id)

        assessments = query.all()
        results: List[AssessmentSchema] = []

        for a in assessments:
            skill = db.query(Skill).filter(Skill.id == a.skill_id).first()
            q_count = db.query(Question).filter(Question.assessment_id == a.id).count()
            results.append(
                AssessmentSchema(
                    id=a.id,
                    title=a.title,
                    description=a.description,
                    skill_id=a.skill_id,
                    skill_slug=skill.slug if skill else None,
                    skill_title=skill.title if skill else None,
                    assessment_type=a.assessment_type,
                    pass_percentage=a.pass_percentage,
                    time_limit_minutes=a.time_limit_minutes,
                    question_count=q_count,
                )
            )
        return results

    @staticmethod
    def start_assessment(db: Session, user_id: int, assessment_id: int) -> AssessmentStartResponse:
        """Initiate an assessment attempt and return questions without correct answer keys."""
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment with id {assessment_id} not found",
            )

        # Retrieve questions
        questions = (
            db.query(Question)
            .filter(Question.assessment_id == assessment_id)
            .order_by(Question.id.asc())
            .all()
        )

        if not questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This assessment does not currently have any configured questions",
            )

        # Create new attempt record
        attempt = AssessmentAttempt(
            assessment_id=assessment.id,
            user_id=user_id,
            score_achieved=0.0,
            is_passed=False,
            started_at=datetime.utcnow(),
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

        # Map to public response (answer keys stripped)
        public_questions = [
            QuestionPublicResponse(
                id=q.id,
                assessment_id=q.assessment_id,
                prompt=q.prompt,
                question_type=q.question_type,
                options_json=q.options_json,
                difficulty=q.difficulty,
                points=q.points,
            )
            for q in questions
        ]

        return AssessmentStartResponse(
            attempt_id=attempt.id,
            assessment_id=assessment.id,
            title=assessment.title,
            time_limit_minutes=assessment.time_limit_minutes,
            started_at=attempt.started_at,
            questions=public_questions,
        )

    @staticmethod
    def submit_assessment(
        db: Session,
        user_id: int,
        attempt_id: int,
        payload: AssessmentSubmissionRequest,
    ) -> AssessmentSubmissionResult:
        """Grade submitted answers server-side, record diagnostic responses, and update concept mastery."""
        # 1. Fetch and validate attempt ownership
        attempt = db.query(AssessmentAttempt).filter(AssessmentAttempt.id == attempt_id).first()
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assessment attempt {attempt_id} not found",
            )

        if attempt.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to submit answers for this attempt",
            )

        if attempt.completed_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This assessment attempt has already been submitted and graded",
            )

        assessment = db.query(Assessment).filter(Assessment.id == attempt.assessment_id).first()
        if not assessment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated assessment definition not found",
            )

        # 2. Fetch all questions for this assessment
        questions = db.query(Question).filter(Question.assessment_id == assessment.id).all()
        question_map = {q.id: q for q in questions}

        if not questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No questions found for this assessment",
            )

        # 3. Server-side grading loop
        total_possible_points = sum(q.points for q in questions)
        total_earned_points = 0
        submission_map = {resp.question_id: resp for resp in payload.responses}

        question_results: List[QuestionResult] = []
        now = datetime.utcnow()

        for q in questions:
            user_sub = submission_map.get(q.id)
            user_ans = user_sub.learner_response_json if user_sub else None
            time_spent = user_sub.time_spent_seconds if user_sub else 0

            # Compare answers cleanly (case-insensitive string match or exact match)
            is_correct = False
            if user_ans is not None:
                if isinstance(q.correct_answer_json, str) and isinstance(user_ans, str):
                    is_correct = q.correct_answer_json.strip().lower() == user_ans.strip().lower()
                else:
                    is_correct = q.correct_answer_json == user_ans

            points_earned = q.points if is_correct else 0
            total_earned_points += points_earned

            # Save individual response
            response_rec = AssessmentResponse(
                attempt_id=attempt.id,
                question_id=q.id,
                learner_response_json=user_ans,
                is_correct=is_correct,
                time_spent_seconds=time_spent,
                diagnostic_feedback=q.explanation,
                created_at=now,
            )
            db.add(response_rec)

            question_results.append(
                QuestionResult(
                    question_id=q.id,
                    prompt=q.prompt,
                    options_json=q.options_json,
                    learner_response_json=user_ans,
                    correct_answer_json=q.correct_answer_json,
                    is_correct=is_correct,
                    explanation=q.explanation,
                    points_earned=points_earned,
                    points_possible=q.points,
                )
            )

        # 4. Finalize attempt score
        score_achieved = (
            round((total_earned_points / total_possible_points) * 100.0, 2)
            if total_possible_points > 0
            else 0.0
        )
        is_passed = score_achieved >= assessment.pass_percentage

        attempt.score_achieved = score_achieved
        attempt.is_passed = is_passed
        attempt.completed_at = now
        db.commit()

        # 5. Trigger Adaptive Engine mastery calibration
        AdaptiveEngine.update_mastery_from_assessment(
            db=db,
            user_id=user_id,
            assessment=assessment,
            score_achieved=score_achieved,
        )

        # 6. Generate immediate adaptive feedback message
        if is_passed:
            feedback = (
                f"Congratulations! You passed with {score_achieved}%. "
                "Your mastery profile has been updated and prerequisite milestones unlocked."
            )
        else:
            feedback = (
                f"Score: {score_achieved}% (Passing requirement: {assessment.pass_percentage}%). "
                "Review the explanations below to target conceptual gaps before your next attempt."
            )

        return AssessmentSubmissionResult(
            attempt_id=attempt.id,
            assessment_id=assessment.id,
            assessment_title=assessment.title,
            score_achieved=score_achieved,
            is_passed=is_passed,
            total_points_possible=total_possible_points,
            total_points_earned=total_earned_points,
            completed_at=now,
            question_results=question_results,
            adaptive_feedback=feedback,
        )

    @staticmethod
    def get_attempt_details(db: Session, user_id: int, attempt_id: int) -> AssessmentSubmissionResult:
        """Retrieve completed attempt results with question explanations and ownership verification."""
        attempt = db.query(AssessmentAttempt).filter(AssessmentAttempt.id == attempt_id).first()
        if not attempt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Attempt {attempt_id} not found",
            )

        if attempt.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this attempt",
            )

        assessment = db.query(Assessment).filter(Assessment.id == attempt.assessment_id).first()
        responses = (
            db.query(AssessmentResponse, Question)
            .join(Question, AssessmentResponse.question_id == Question.id)
            .filter(AssessmentResponse.attempt_id == attempt.id)
            .order_by(Question.id.asc())
            .all()
        )

        question_results: List[QuestionResult] = []
        total_possible = 0
        total_earned = 0

        for resp, q in responses:
            points_earned = q.points if resp.is_correct else 0
            total_earned += points_earned
            total_possible += q.points
            question_results.append(
                QuestionResult(
                    question_id=q.id,
                    prompt=q.prompt,
                    options_json=q.options_json,
                    learner_response_json=resp.learner_response_json,
                    correct_answer_json=q.correct_answer_json,
                    is_correct=resp.is_correct,
                    explanation=resp.diagnostic_feedback or q.explanation,
                    points_earned=points_earned,
                    points_possible=q.points,
                )
            )

        return AssessmentSubmissionResult(
            attempt_id=attempt.id,
            assessment_id=assessment.id if assessment else 0,
            assessment_title=assessment.title if assessment else "Assessment",
            score_achieved=attempt.score_achieved,
            is_passed=attempt.is_passed,
            total_points_possible=total_possible,
            total_points_earned=total_earned,
            completed_at=attempt.completed_at or attempt.started_at,
            question_results=question_results,
            adaptive_feedback="Completed assessment record.",
        )

    @staticmethod
    def get_user_attempt_history(db: Session, user_id: int) -> List[AssessmentAttemptSummary]:
        """Retrieve student's historical assessment sessions."""
        attempts = (
            db.query(AssessmentAttempt, Assessment, Skill)
            .join(Assessment, AssessmentAttempt.assessment_id == Assessment.id)
            .join(Skill, Assessment.skill_id == Skill.id)
            .filter(AssessmentAttempt.user_id == user_id)
            .order_by(AssessmentAttempt.started_at.desc())
            .all()
        )

        return [
            AssessmentAttemptSummary(
                id=att.id,
                assessment_id=att.assessment_id,
                assessment_title=asm.title,
                skill_title=skl.title,
                score_achieved=att.score_achieved,
                is_passed=att.is_passed,
                started_at=att.started_at,
                completed_at=att.completed_at,
            )
            for att, asm, skl in attempts
        ]
