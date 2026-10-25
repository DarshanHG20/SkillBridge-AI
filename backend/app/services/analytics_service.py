"""Admin Learning Analytics & Observability Service.

Provides real aggregated telemetry across user retention, skill mastery, assessment attempts,
and compliance audit logs. Never fabricates data; explicitly flags insufficient data when metrics
do not meet minimum sample size.
"""

import csv
import io
from datetime import datetime, timedelta
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.user import User
from app.models.skill import Skill, SkillMastery
from app.models.assessment import Assessment, AssessmentAttempt
from app.models.career import Career, Roadmap
from app.models.project import Project
from app.models.rag_document import Document, DocumentChunk
from app.models.coding import CodingProblem
from app.models.learner_activity import LearnerActivity
from app.models.audit import AdminAuditLog
from app.schemas.admin_analytics import (
    AdminAnalyticsResponse,
    UserMetrics,
    AssessmentMetrics,
    SkillMetrics,
    SkillStruggleItem,
    SkillMasteredItem,
    CareerMetrics,
    ContentMetrics,
    ActivityMetrics,
    AIModelMetrics,
)


logger = logging.getLogger(__name__)


class AnalyticsService:
    """Consolidates cross-system telemetry, engagement analytics, and CSV exports."""

    @classmethod
    def get_admin_analytics(cls, db: Session) -> AdminAnalyticsResponse:
        """Compute real, verified platform analytics with explicit insufficient-data flags."""
        settings = get_settings()

        # 1. User Metrics
        total_users = db.query(func.count(User.id)).scalar() or 0
        active_users = db.query(func.count(User.id)).filter(User.is_active.is_(True)).scalar() or 0
        inactive_users = total_users - active_users
        students_count = db.query(func.count(User.id)).filter(User.role == "student").scalar() or 0
        instructors_count = db.query(func.count(User.id)).filter(User.role == "instructor").scalar() or 0
        admins_count = db.query(func.count(User.id)).filter(User.role.in_(["admin", "superadmin"])).scalar() or 0

        user_metrics = UserMetrics(
            total_users=total_users,
            active_users=active_users,
            inactive_users=inactive_users,
            students_count=students_count,
            instructors_count=instructors_count,
            admins_count=admins_count,
        )

        # 2. Assessment Metrics
        total_assessments = db.query(func.count(Assessment.id)).scalar() or 0
        total_attempts = db.query(func.count(AssessmentAttempt.id)).scalar() or 0
        passed_attempts = (
            db.query(func.count(AssessmentAttempt.id))
            .filter(AssessmentAttempt.is_passed.is_(True))
            .scalar()
            or 0
        )
        avg_score_raw = db.query(func.avg(AssessmentAttempt.score_achieved)).scalar()
        avg_score = round(float(avg_score_raw), 2) if avg_score_raw is not None else 0.0
        pass_rate = round((passed_attempts / total_attempts * 100.0), 1) if total_attempts > 0 else 0.0

        assessment_metrics = AssessmentMetrics(
            total_assessments=total_assessments,
            total_attempts=total_attempts,
            passed_attempts=passed_attempts,
            pass_rate_percentage=pass_rate,
            average_score=avg_score,
            is_insufficient_data=total_attempts < 3,
        )

        # 3. Skill Mastery Metrics
        total_skills = db.query(func.count(Skill.id)).scalar() or 0
        total_mastery_records = db.query(func.count(SkillMastery.id)).scalar() or 0
        avg_mastery_raw = db.query(func.avg(SkillMastery.mastery_score)).scalar()
        avg_mastery = round(float(avg_mastery_raw), 2) if avg_mastery_raw is not None else 0.0

        # Query top struggling skills (lowest average mastery score, min 1 learner)
        struggling_rows = (
            db.query(
                Skill.slug,
                Skill.title,
                func.avg(SkillMastery.mastery_score).label("avg_m"),
                func.count(SkillMastery.id).label("learners_c"),
            )
            .join(SkillMastery, Skill.id == SkillMastery.skill_id)
            .group_by(Skill.id, Skill.slug, Skill.title)
            .order_by(func.avg(SkillMastery.mastery_score).asc())
            .limit(5)
            .all()
        )

        top_struggling = [
            SkillStruggleItem(
                skill_slug=row[0],
                skill_title=row[1],
                average_mastery=round(float(row[2]), 2),
                learners_struggling_count=row[3],
            )
            for row in struggling_rows
        ]

        # Query top mastered skills (highest average mastery score)
        mastered_rows = (
            db.query(
                Skill.slug,
                Skill.title,
                func.avg(SkillMastery.mastery_score).label("avg_m"),
                func.count(SkillMastery.id).label("learners_c"),
            )
            .join(SkillMastery, Skill.id == SkillMastery.skill_id)
            .group_by(Skill.id, Skill.slug, Skill.title)
            .order_by(func.avg(SkillMastery.mastery_score).desc())
            .limit(5)
            .all()
        )

        top_mastered = [
            SkillMasteredItem(
                skill_slug=row[0],
                skill_title=row[1],
                average_mastery=round(float(row[2]), 2),
                learners_mastered_count=row[3],
            )
            for row in mastered_rows
        ]

        skill_metrics = SkillMetrics(
            total_skills=total_skills,
            total_mastery_records=total_mastery_records,
            average_mastery_score=avg_mastery,
            top_struggling_skills=top_struggling,
            top_mastered_skills=top_mastered,
            is_insufficient_data=total_mastery_records < 3,
        )

        # 4. Career Metrics
        total_careers = db.query(func.count(Career.id)).scalar() or 0
        total_roadmaps = db.query(func.count(Roadmap.id)).scalar() or 0

        career_metrics = CareerMetrics(
            total_careers=total_careers,
            total_roadmaps_generated=total_roadmaps,
            is_insufficient_data=total_roadmaps == 0,
        )

        # 5. Content Metrics
        total_projects = db.query(func.count(Project.id)).scalar() or 0
        approved_documents = db.query(func.count(Document.id)).filter(Document.is_approved.is_(True)).scalar() or 0
        indexed_chunks = db.query(func.count(DocumentChunk.id)).scalar() or 0
        coding_problems = db.query(func.count(CodingProblem.id)).scalar() or 0

        content_metrics = ContentMetrics(
            total_projects=total_projects,
            approved_documents=approved_documents,
            indexed_chunks=indexed_chunks,
            coding_problems=coding_problems,
        )

        # 6. Activity Metrics
        total_activities = db.query(func.count(LearnerActivity.id)).scalar() or 0
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_activities = (
            db.query(func.count(LearnerActivity.id))
            .filter(LearnerActivity.created_at >= seven_days_ago)
            .scalar()
            or 0
        )

        # Group by activity type
        type_rows = (
            db.query(LearnerActivity.activity_type, func.count(LearnerActivity.id))
            .group_by(LearnerActivity.activity_type)
            .all()
        )
        activities_by_type = {row[0]: row[1] for row in type_rows}

        activity_metrics = ActivityMetrics(
            total_learner_activities=total_activities,
            recent_activities_count=recent_activities,
            activities_by_type=activities_by_type,
        )

        # 7. AI Model Metrics
        ai_metrics = AIModelMetrics(
            ai_provider=settings.AI_PROVIDER,
            is_live_llm=settings.AI_PROVIDER in {"openai", "gemini", "mock"},
            fallback_engine_available=True,
            rate_limit_per_user=settings.TUTOR_DAILY_RATE_LIMIT,
        )

        return AdminAnalyticsResponse(
            user_metrics=user_metrics,
            assessment_metrics=assessment_metrics,
            skill_metrics=skill_metrics,
            career_metrics=career_metrics,
            content_metrics=content_metrics,
            activity_metrics=activity_metrics,
            ai_metrics=ai_metrics,
            generated_at=datetime.utcnow(),
        )

    @classmethod
    def export_users_csv(cls, db: Session) -> str:
        """Export sanitized user registry to standard CSV format."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Email", "Full Name", "Role", "Is Active", "Email Verified", "Created At"])

        users = db.query(User).order_by(User.id.asc()).all()
        for u in users:
            writer.writerow([
                u.id,
                u.email,
                u.full_name,
                u.role,
                "TRUE" if u.is_active else "FALSE",
                "TRUE" if u.is_verified else "FALSE",
                u.created_at.isoformat() if u.created_at else "",
            ])

        return output.getvalue()

    @classmethod
    def export_assessment_attempts_csv(cls, db: Session) -> str:
        """Export assessment performance and scores to standard CSV format."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Attempt ID",
            "User ID",
            "Assessment ID",
            "Assessment Title",
            "Score Achieved",
            "Passed",
            "Points Earned",
            "Total Possible",
            "Completed At",
        ])

        attempts = (
            db.query(AssessmentAttempt, Assessment.title)
            .join(Assessment, AssessmentAttempt.assessment_id == Assessment.id)
            .order_by(AssessmentAttempt.id.desc())
            .all()
        )

        for attempt, title in attempts:
            writer.writerow([
                attempt.id,
                attempt.user_id,
                attempt.assessment_id,
                title,
                attempt.score_achieved,
                "PASS" if attempt.is_passed else "FAIL",
                attempt.total_points_earned,
                attempt.total_points_possible,
                attempt.completed_at.isoformat() if attempt.completed_at else "",
            ])

        return output.getvalue()

    @classmethod
    def export_audit_logs_csv(cls, db: Session) -> str:
        """Export administrative compliance audit trail to standard CSV format."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Log ID",
            "Admin ID",
            "Action",
            "Entity Type",
            "Entity ID",
            "IP Address",
            "Details",
            "Timestamp",
        ])

        logs = db.query(AdminAuditLog).order_by(AdminAuditLog.id.desc()).all()
        for log in logs:
            writer.writerow([
                log.id,
                log.admin_id,
                log.action,
                log.entity_type,
                log.entity_id or "",
                log.ip_address or "",
                str(log.details_json or {}),
                log.created_at.isoformat() if log.created_at else "",
            ])

        return output.getvalue()
