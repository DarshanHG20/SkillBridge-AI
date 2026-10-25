"""Career Intelligence service handling gap analysis, roadmaps, and project recommendations."""

from datetime import datetime
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.career import Career, CareerRequirement, Roadmap
from app.models.skill import Skill, SkillMastery
from app.models.project import Project
from app.schemas.career import (
    CareerResponse,
    CareerRequirementItem,
    CareerGapAnalysisResponse,
    RoadmapResponse,
    RoadmapMilestone,
    CAREER_DISCLAIMER,
)


class CareerService:
    """Service providing career intelligence, competency gap analysis, and tailored roadmaps."""

    @staticmethod
    def list_careers(db: Session) -> List[CareerResponse]:
        """List all available career pathways with their core skill requirements."""
        careers = db.query(Career).all()
        results: List[CareerResponse] = []

        for c in careers:
            reqs = (
                db.query(CareerRequirement, Skill)
                .join(Skill, CareerRequirement.skill_id == Skill.id)
                .filter(CareerRequirement.career_id == c.id)
                .all()
            )

            req_items = [
                CareerRequirementItem(
                    skill_id=r.skill_id,
                    skill_slug=s.slug,
                    skill_title=s.title,
                    category=s.category,
                    minimum_mastery_level=r.minimum_mastery_level,
                    weight=r.weight,
                    current_mastery=0.0,
                    gap=r.minimum_mastery_level,
                    is_satisfied=False,
                )
                for r, s in reqs
            ]

            results.append(
                CareerResponse(
                    id=c.id,
                    slug=c.slug,
                    title=c.title,
                    description=c.description,
                    average_salary_range=c.average_salary_range,
                    industry=c.industry,
                    requirements=req_items,
                )
            )

        return results

    @staticmethod
    def get_career_by_slug(db: Session, slug: str) -> Career:
        """Fetch career by slug or raise 404."""
        career = db.query(Career).filter(Career.slug == slug).first()
        if not career:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Career pathway '{slug}' not found",
            )
        return career

    @staticmethod
    def analyze_career_gap(db: Session, user_id: int, career_slug: str) -> CareerGapAnalysisResponse:
        """Perform weighted gap analysis comparing learner's skill mastery against career benchmark."""
        career = CareerService.get_career_by_slug(db, career_slug)
        requirements = (
            db.query(CareerRequirement, Skill)
            .join(Skill, CareerRequirement.skill_id == Skill.id)
            .filter(CareerRequirement.career_id == career.id)
            .all()
        )

        if not requirements:
            return CareerGapAnalysisResponse(
                career_id=career.id,
                career_slug=career.slug,
                career_title=career.title,
                overall_readiness_percentage=0.0,
                skills_analyzed_count=0,
                skills_met_count=0,
                top_skill_gaps=[],
                strengths=[],
                recommended_project_titles=[],
            )

        # Get learner's current mastery
        req_skill_ids = [r.skill_id for r, _ in requirements]
        mastery_rows = (
            db.query(SkillMastery)
            .filter(
                SkillMastery.user_id == user_id,
                SkillMastery.skill_id.in_(req_skill_ids),
            )
            .all()
        )
        mastery_map = {m.skill_id: m.mastery_score for m in mastery_rows}

        total_weighted_target = 0.0
        total_weighted_achieved = 0.0
        analyzed_items: List[CareerRequirementItem] = []

        for req, skill in requirements:
            user_score = mastery_map.get(req.skill_id, 0.0)
            target = req.minimum_mastery_level
            weight = req.weight

            total_weighted_target += target * weight
            total_weighted_achieved += min(user_score, target) * weight

            gap = max(0.0, target - user_score)
            is_satisfied = user_score >= target

            analyzed_items.append(
                CareerRequirementItem(
                    skill_id=skill.id,
                    skill_slug=skill.slug,
                    skill_title=skill.title,
                    category=skill.category,
                    minimum_mastery_level=target,
                    weight=weight,
                    current_mastery=round(user_score, 2),
                    gap=round(gap, 2),
                    is_satisfied=is_satisfied,
                )
            )

        readiness = (
            round((total_weighted_achieved / total_weighted_target) * 100.0, 1)
            if total_weighted_target > 0
            else 0.0
        )

        strengths = [item for item in analyzed_items if item.is_satisfied]
        gaps = [item for item in analyzed_items if not item.is_satisfied]
        # Sort gaps by gap descending, then weight descending
        gaps.sort(key=lambda x: (x.gap, x.weight), reverse=True)

        # Find recommended projects matching career or gaps
        projects = db.query(Project).all()
        recommended_projects = [
            p.title for p in projects[:2]
        ]

        skills_met = len(strengths)

        return CareerGapAnalysisResponse(
            career_id=career.id,
            career_slug=career.slug,
            career_title=career.title,
            overall_readiness_percentage=readiness,
            skills_analyzed_count=len(analyzed_items),
            skills_met_count=skills_met,
            top_skill_gaps=gaps,
            strengths=strengths,
            recommended_project_titles=recommended_projects,
            disclaimer=CAREER_DISCLAIMER,
        )

    @staticmethod
    def generate_roadmap(
        db: Session,
        user_id: int,
        career_slug: str,
        plan_type: str = "90_day",
    ) -> RoadmapResponse:
        """Synthesize a structured 30/60/90 day milestone roadmap tailored to identified gaps."""
        gap_report = CareerService.analyze_career_gap(db, user_id, career_slug)
        career = CareerService.get_career_by_slug(db, career_slug)

        gap_titles = [item.skill_title for item in gap_report.top_skill_gaps]
        if not gap_titles:
            gap_titles = ["Advanced System Optimization", "Industry Capstone Production"]

        # Milestone synthesis based on plan duration
        milestones: List[RoadmapMilestone] = []

        if plan_type == "30_day":
            slice_1 = gap_titles[:2] if len(gap_titles) >= 2 else gap_titles
            slice_2 = gap_titles[2:4] if len(gap_titles) >= 4 else gap_titles[:1]
            milestones = [
                RoadmapMilestone(
                    period="Days 1-10",
                    focus_area="Foundational Gaps & Syntax",
                    target_skills=slice_1,
                    action_items=[
                        f"Complete diagnostic and practice drills in {', '.join(slice_1)}",
                        "Target minimum 70% assessment score to unlock dependent modules",
                    ],
                ),
                RoadmapMilestone(
                    period="Days 11-20",
                    focus_area="Core Application & Integration",
                    target_skills=slice_2,
                    action_items=[
                        f"Build end-to-end exercises focusing on {', '.join(slice_2)}",
                        "Review error logs and complete adaptive revision drills",
                    ],
                ),
                RoadmapMilestone(
                    period="Days 21-30",
                    focus_area="Synthesis & Portfolio Deliverable",
                    target_skills=gap_titles[:3],
                    action_items=[
                        "Submit first milestone for hands-on capstone project",
                        "Review career gap analysis to measure readiness improvement",
                    ],
                    milestone_project=gap_report.recommended_project_titles[0] if gap_report.recommended_project_titles else None,
                ),
            ]
        elif plan_type == "60_day":
            slice_1 = gap_titles[:2]
            slice_2 = gap_titles[2:4] if len(gap_titles) >= 4 else gap_titles
            slice_3 = gap_titles[4:6] if len(gap_titles) >= 6 else gap_titles[:2]
            milestones = [
                RoadmapMilestone(
                    period="Month 1: Weeks 1-2",
                    focus_area="Foundational Remediation",
                    target_skills=slice_1,
                    action_items=[
                        f"Master foundational prerequisites: {', '.join(slice_1)}",
                        "Achieve >= 80% competency on formative quizzes",
                    ],
                ),
                RoadmapMilestone(
                    period="Month 1: Weeks 3-4",
                    focus_area="Intermediate Implementation",
                    target_skills=slice_2,
                    action_items=[
                        f"Integrate intermediate patterns in {', '.join(slice_2)}",
                        "Construct reusable utility modules with test coverage",
                    ],
                ),
                RoadmapMilestone(
                    period="Month 2: Weeks 5-6",
                    focus_area="Advanced System Architecture",
                    target_skills=slice_3,
                    action_items=[
                        f"Implement advanced features and security hardening for {', '.join(slice_3)}",
                        "Refactor code against production rubrics",
                    ],
                ),
                RoadmapMilestone(
                    period="Month 2: Weeks 7-8",
                    focus_area="End-to-End Capstone Project",
                    target_skills=gap_titles[:4],
                    action_items=[
                        "Complete and document all project milestones with GitHub evidence",
                        "Achieve target career readiness benchmark score",
                    ],
                    milestone_project=gap_report.recommended_project_titles[0] if gap_report.recommended_project_titles else None,
                ),
            ]
        else:  # "90_day"
            slice_1 = gap_titles[:2]
            slice_2 = gap_titles[2:4] if len(gap_titles) >= 4 else gap_titles
            slice_3 = gap_titles[4:6] if len(gap_titles) >= 6 else gap_titles
            milestones = [
                RoadmapMilestone(
                    period="Month 1 (Days 1-30)",
                    focus_area="Core Foundations & Prerequisite Closure",
                    target_skills=slice_1,
                    action_items=[
                        f"Address root concept gaps in {', '.join(slice_1)}",
                        "Complete all formative assessments with >= 75% score",
                    ],
                ),
                RoadmapMilestone(
                    period="Month 2 (Days 31-60)",
                    focus_area="Intermediate Systems & Real-World APIs",
                    target_skills=slice_2,
                    action_items=[
                        f"Build production-grade components using {', '.join(slice_2)}",
                        "Incorporate logging, error handling, and unit test suites",
                    ],
                ),
                RoadmapMilestone(
                    period="Month 3 (Days 61-90)",
                    focus_area="Advanced Engineering & Capstone Portfolio",
                    target_skills=slice_3,
                    action_items=[
                        f"Master advanced paradigms in {', '.join(slice_3)}",
                        "Complete full capstone project with verifiable repository evidence",
                    ],
                    milestone_project=gap_report.recommended_project_titles[0] if gap_report.recommended_project_titles else None,
                ),
            ]

        # Persist or update roadmap record
        milestones_json_payload = [m.model_dump() for m in milestones]
        existing_roadmap = (
            db.query(Roadmap)
            .filter(
                Roadmap.user_id == user_id,
                Roadmap.career_id == career.id,
                Roadmap.plan_type == plan_type,
            )
            .first()
        )

        now = datetime.utcnow()
        if existing_roadmap:
            existing_roadmap.milestones_json = milestones_json_payload
            existing_roadmap.completion_percentage = gap_report.overall_readiness_percentage
            db.commit()
            db.refresh(existing_roadmap)
            roadmap_rec = existing_roadmap
        else:
            roadmap_rec = Roadmap(
                user_id=user_id,
                career_id=career.id,
                title=f"{career.title} {plan_type.replace('_', '-').title()} Pathway",
                plan_type=plan_type,
                milestones_json=milestones_json_payload,
                completion_percentage=gap_report.overall_readiness_percentage,
                created_at=now,
            )
            db.add(roadmap_rec)
            db.commit()
            db.refresh(roadmap_rec)

        return RoadmapResponse(
            id=roadmap_rec.id,
            career_id=career.id,
            career_title=career.title,
            title=roadmap_rec.title,
            plan_type=roadmap_rec.plan_type,
            milestones=milestones,
            completion_percentage=roadmap_rec.completion_percentage,
            created_at=roadmap_rec.created_at,
            disclaimer=CAREER_DISCLAIMER,
        )
