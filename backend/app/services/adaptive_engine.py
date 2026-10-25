"""Adaptive Learning Engine for SkillBridge AI.

USP Architecture:
- Concept-level mastery calibration using weighted Bayesian updates
- Automated weak concept identification and error rate diagnosis
- DAG prerequisite dependency verification
- Contextual next-best activity recommendation with explainability strings
"""

from datetime import datetime
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.skill import Skill, SkillPrerequisite, SkillMastery
from app.models.assessment import Assessment, AssessmentAttempt, AssessmentResponse, Question
from app.models.learner_activity import LearnerActivity
from app.models.project import Project
from app.schemas.adaptive import (
    AdaptiveRecommendationResponse,
    LearnerMasteryOverview,
    WeakConceptItem,
)
from app.services.skill_service import SkillService


# Documented Domain Rules & Thresholds (Transparent Heuristic Baseline)
MASTERY_REVISION_THRESHOLD = 0.60    # Below 60% triggers concept revision
MASTERY_ADVANCE_THRESHOLD = 0.85     # Above 85% unlocks dependent skills or projects
ERROR_RATE_WEAKNESS_THRESHOLD = 0.40 # If >= 40% errors in concept, flag as weak
MASTERY_LEARNING_RATE = 0.35         # Exponential update weight for new evidence


class AdaptiveEngine:
    """Dedicated, deterministic adaptive learning service."""

    @staticmethod
    def update_mastery_from_assessment(
        db: Session,
        user_id: int,
        assessment: Assessment,
        score_achieved: float,  # Percentage 0.0 - 100.0
    ) -> SkillMastery:
        """Update learner's concept mastery score following an assessment attempt."""
        skill_id = assessment.skill_id
        score_ratio = max(0.0, min(1.0, score_achieved / 100.0))

        mastery_record = (
            db.query(SkillMastery)
            .filter(
                SkillMastery.user_id == user_id,
                SkillMastery.skill_id == skill_id,
            )
            .first()
        )

        now = datetime.utcnow()
        if not mastery_record:
            # First attempt initialization
            new_score = score_ratio
            confidence = 0.6
            status_val = "mastered" if new_score >= MASTERY_ADVANCE_THRESHOLD else "in_progress"
            mastery_record = SkillMastery(
                user_id=user_id,
                skill_id=skill_id,
                mastery_score=new_score,
                confidence_score=confidence,
                status=status_val,
                last_practiced_at=now,
            )
            db.add(mastery_record)
        else:
            # Weighted Bayesian / Exponential Moving Average update
            old_score = mastery_record.mastery_score
            new_score = ((1.0 - MASTERY_LEARNING_RATE) * old_score) + (MASTERY_LEARNING_RATE * score_ratio)
            new_score = round(max(0.0, min(1.0, new_score)), 3)

            # Increase confidence with additional practice (asymptotic cap at 0.95)
            new_conf = round(min(0.95, mastery_record.confidence_score + 0.10), 2)

            # Determine status
            if new_score >= MASTERY_ADVANCE_THRESHOLD:
                status_val = "mastered"
            elif new_score >= MASTERY_REVISION_THRESHOLD:
                status_val = "in_progress"
            else:
                status_val = "in_progress"  # Needs revision

            mastery_record.mastery_score = new_score
            mastery_record.confidence_score = new_conf
            mastery_record.status = status_val
            mastery_record.last_practiced_at = now

        # Log LearnerActivity for auditable progress timeline
        activity = LearnerActivity(
            user_id=user_id,
            activity_type=f"assessment_{assessment.assessment_type}",
            metadata_json={
                "assessment_id": assessment.id,
                "assessment_title": assessment.title,
                "skill_id": skill_id,
                "score": score_achieved,
                "updated_mastery": mastery_record.mastery_score,
            },
        )
        db.add(activity)
        db.commit()
        db.refresh(mastery_record)
        return mastery_record

    @staticmethod
    def identify_weak_concepts(db: Session, user_id: int) -> List[WeakConceptItem]:
        """Diagnose concepts where mastery is below 60% or recent error rate is elevated."""
        mastery_rows = (
            db.query(SkillMastery, Skill)
            .join(Skill, SkillMastery.skill_id == Skill.id)
            .filter(SkillMastery.user_id == user_id)
            .all()
        )

        weak_items: List[WeakConceptItem] = []

        for mastery, skill in mastery_rows:
            # Query recent question responses for this skill's assessments
            assessments = db.query(Assessment.id).filter(Assessment.skill_id == skill.id).all()
            assessment_ids = [a[0] for a in assessments]

            error_rate = 0.0
            if assessment_ids:
                total_responses = (
                    db.query(func.count(AssessmentResponse.id))
                    .join(AssessmentAttempt, AssessmentResponse.attempt_id == AssessmentAttempt.id)
                    .filter(
                        AssessmentAttempt.user_id == user_id,
                        AssessmentAttempt.assessment_id.in_(assessment_ids),
                    )
                    .scalar() or 0
                )

                incorrect_responses = (
                    db.query(func.count(AssessmentResponse.id))
                    .join(AssessmentAttempt, AssessmentResponse.attempt_id == AssessmentAttempt.id)
                    .filter(
                        AssessmentAttempt.user_id == user_id,
                        AssessmentAttempt.assessment_id.in_(assessment_ids),
                        AssessmentResponse.is_correct.is_(False),
                    )
                    .scalar() or 0
                )

                if total_responses > 0:
                    error_rate = round(incorrect_responses / total_responses, 2)

            is_weak = (
                mastery.mastery_score < MASTERY_REVISION_THRESHOLD
                or error_rate >= ERROR_RATE_WEAKNESS_THRESHOLD
            )

            if is_weak:
                reason = (
                    f"Current mastery is {int(mastery.mastery_score * 100)}% "
                    f"(target >= {int(MASTERY_REVISION_THRESHOLD * 100)}%), "
                    f"with an error rate of {int(error_rate * 100)}% across recent checks."
                )
                action = "Foundational revision & diagnostic drill"
                weak_items.append(
                    WeakConceptItem(
                        skill_id=skill.id,
                        skill_slug=skill.slug,
                        skill_title=skill.title,
                        category=skill.category,
                        mastery_score=mastery.mastery_score,
                        status=mastery.status,
                        error_rate=error_rate,
                        recommended_action=action,
                        reason=reason,
                    )
                )

        # Sort weakest first
        weak_items.sort(key=lambda x: (x.mastery_score, -x.error_rate))
        return weak_items

    @staticmethod
    def get_learner_mastery_overview(db: Session, user_id: int) -> LearnerMasteryOverview:
        """Compile aggregate progress analytics and weak concept breakdown."""
        total_skills = db.query(func.count(Skill.id)).scalar() or 0
        mastery_rows = db.query(SkillMastery).filter(SkillMastery.user_id == user_id).all()

        mastered = sum(1 for m in mastery_rows if m.mastery_score >= MASTERY_ADVANCE_THRESHOLD)
        in_progress = sum(1 for m in mastery_rows if 0.0 < m.mastery_score < MASTERY_ADVANCE_THRESHOLD)
        locked = max(0, total_skills - len(mastery_rows))

        avg_mastery = 0.0
        if mastery_rows:
            avg_mastery = round(sum(m.mastery_score for m in mastery_rows) / len(mastery_rows), 2)

        weak_concepts = AdaptiveEngine.identify_weak_concepts(db, user_id)

        return LearnerMasteryOverview(
            total_skills=total_skills,
            mastered_count=mastered,
            in_progress_count=in_progress,
            locked_count=locked,
            average_mastery=avg_mastery,
            weak_concepts=weak_concepts,
        )

    @staticmethod
    def select_next_activity(db: Session, user_id: int) -> AdaptiveRecommendationResponse:
        """Core Adaptive Algorithm: selects optimal learning activity with transparent reasoning."""
        # 1. Rule 1: High-Priority Weak Concepts (Mastery < 0.60)
        weak_concepts = AdaptiveEngine.identify_weak_concepts(db, user_id)
        if weak_concepts:
            weakest = weak_concepts[0]
            assessment = db.query(Assessment).filter(Assessment.skill_id == weakest.skill_id).first()
            return AdaptiveRecommendationResponse(
                recommendation_type="revision",
                activity_type="review" if not assessment else "assessment",
                target_skill_id=weakest.skill_id,
                target_skill_slug=weakest.skill_slug,
                target_skill_title=weakest.skill_title,
                category=weakest.category,
                difficulty="beginner",
                reason=(
                    f"Reinforce '{weakest.skill_title}'. Your recent mastery of "
                    f"{int(weakest.mastery_score * 100)}% is below the proficiency threshold "
                    f"({int(MASTERY_REVISION_THRESHOLD * 100)}%). Addressing this gap now "
                    "will ensure smooth progress on dependent topics."
                ),
                prerequisites_satisfied=True,
                missing_prerequisites=[],
                confidence_score=0.75,
            )

        # 2. Rule 2: In-Progress Skills (0.60 <= Mastery < 0.85)
        in_progress = (
            db.query(SkillMastery, Skill)
            .join(Skill, SkillMastery.skill_id == Skill.id)
            .filter(
                SkillMastery.user_id == user_id,
                SkillMastery.mastery_score >= MASTERY_REVISION_THRESHOLD,
                SkillMastery.mastery_score < MASTERY_ADVANCE_THRESHOLD,
            )
            .order_by(SkillMastery.last_practiced_at.asc())
            .first()
        )

        if in_progress:
            mastery, skill = in_progress
            return AdaptiveRecommendationResponse(
                recommendation_type="practice",
                activity_type="practice",
                target_skill_id=skill.id,
                target_skill_slug=skill.slug,
                target_skill_title=skill.title,
                category=skill.category,
                difficulty="intermediate",
                reason=(
                    f"Level up '{skill.title}'. You have reached {int(mastery.mastery_score * 100)}% "
                    f"mastery. Practice intermediate scenarios to cross the "
                    f"{int(MASTERY_ADVANCE_THRESHOLD * 100)}% mastery threshold."
                ),
                prerequisites_satisfied=True,
                missing_prerequisites=[],
                confidence_score=0.80,
            )

        # 3. Rule 3: Advance to Next Skill in DAG Hierarchy
        # Check unlocked skills that have not yet been practiced
        all_skills = db.query(Skill).all()
        practiced_ids = {
            m.skill_id
            for m in db.query(SkillMastery.skill_id).filter(SkillMastery.user_id == user_id).all()
        }

        for skill in all_skills:
            if skill.id not in practiced_ids:
                is_met, unmet = SkillService.check_prerequisites_met(db, user_id, skill.id)
                if is_met:
                    return AdaptiveRecommendationResponse(
                        recommendation_type="advance_skill",
                        activity_type="assessment",
                        target_skill_id=skill.id,
                        target_skill_slug=skill.slug,
                        target_skill_title=skill.title,
                        category=skill.category,
                        difficulty=skill.difficulty_level,
                        reason=(
                            f"Ready for '{skill.title}'! All prerequisite foundations are satisfied. "
                            "Take the diagnostic check to gauge initial competency."
                        ),
                        prerequisites_satisfied=True,
                        missing_prerequisites=[],
                        confidence_score=0.85,
                    )

        # 4. Rule 4: Capstone Hands-On Project
        # When all foundational skills have been tackled, recommend an applicable project
        mastered_slugs = {
            s.slug
            for m, s in db.query(SkillMastery, Skill)
            .join(Skill, SkillMastery.skill_id == Skill.id)
            .filter(SkillMastery.user_id == user_id, SkillMastery.mastery_score >= MASTERY_ADVANCE_THRESHOLD)
            .all()
        }

        project = db.query(Project).first()
        if project:
            return AdaptiveRecommendationResponse(
                recommendation_type="project",
                activity_type="project",
                target_skill_id=None,
                target_skill_slug=None,
                target_skill_title=project.title,
                category="Hands-on Project",
                difficulty=project.difficulty,
                reason=(
                    f"Excellent performance across core knowledge areas! Solidify your portfolio "
                    f"by building the hands-on project '{project.title}'."
                ),
                prerequisites_satisfied=True,
                missing_prerequisites=[],
                related_project_id=project.id,
                confidence_score=0.90,
            )

        # 5. Default Fallback for Brand-New Learner
        first_skill = db.query(Skill).filter(Skill.slug == "python-basics").first() or db.query(Skill).first()
        target_id = first_skill.id if first_skill else None
        target_slug = first_skill.slug if first_skill else None
        target_title = first_skill.title if first_skill else "Foundations"

        return AdaptiveRecommendationResponse(
            recommendation_type="advance_skill",
            activity_type="assessment",
            target_skill_id=target_id,
            target_skill_slug=target_slug,
            target_skill_title=target_title,
            category=first_skill.category if first_skill else "Foundations",
            difficulty="beginner",
            reason=(
                "Welcome to SkillBridge AI! Begin your personalized journey with an initial "
                f"diagnostic in '{target_title}' to map your baseline skill profile."
            ),
            prerequisites_satisfied=True,
            missing_prerequisites=[],
            confidence_score=0.50,
        )
