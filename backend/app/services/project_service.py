"""Project service managing project templates, student enrollment, and milestone submissions."""

from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.project import Project, StudentProjectProgress
from app.schemas.project import (
    ProjectResponse,
    ProjectProgressUpdateRequest,
    StudentProjectProgressResponse,
)


class ProjectService:
    """Service handling hands-on project discovery, milestone tracking, and student portfolio evidence."""

    @staticmethod
    def list_projects(db: Session, user_id: Optional[int] = None) -> List[ProjectResponse]:
        """Fetch all project templates annotated with user's active enrollment status."""
        projects = db.query(Project).all()
        results: List[ProjectResponse] = []

        progress_map = {}
        if user_id:
            user_progress = (
                db.query(StudentProjectProgress)
                .filter(StudentProjectProgress.user_id == user_id)
                .all()
            )
            progress_map = {p.project_id: p for p in user_progress}

        for p in projects:
            prog = progress_map.get(p.id)
            results.append(
                ProjectResponse(
                    id=p.id,
                    title=p.title,
                    description=p.description,
                    difficulty=p.difficulty,
                    rubric_json=p.rubric_json,
                    milestones_json=p.milestones_json,
                    recommended_skills_json=p.recommended_skills_json,
                    career_id=p.career_id,
                    is_enrolled=prog is not None,
                    current_status=prog.status if prog else None,
                    current_completion=prog.completion_percentage if prog else 0.0,
                )
            )
        return results

    @staticmethod
    def get_project_by_id(db: Session, project_id: int, user_id: Optional[int] = None) -> ProjectResponse:
        """Fetch project details by ID with enrollment status."""
        p = db.query(Project).filter(Project.id == project_id).first()
        if not p:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with id {project_id} not found",
            )

        prog = None
        if user_id:
            prog = (
                db.query(StudentProjectProgress)
                .filter(
                    StudentProjectProgress.user_id == user_id,
                    StudentProjectProgress.project_id == project_id,
                )
                .first()
            )

        return ProjectResponse(
            id=p.id,
            title=p.title,
            description=p.description,
            difficulty=p.difficulty,
            rubric_json=p.rubric_json,
            milestones_json=p.milestones_json,
            recommended_skills_json=p.recommended_skills_json,
            career_id=p.career_id,
            is_enrolled=prog is not None,
            current_status=prog.status if prog else None,
            current_completion=prog.completion_percentage if prog else 0.0,
        )

    @staticmethod
    def update_project_progress(
        db: Session,
        user_id: int,
        project_id: int,
        payload: ProjectProgressUpdateRequest,
    ) -> StudentProjectProgressResponse:
        """Enroll or advance a student's project progress with verification notes."""
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with id {project_id} not found",
            )

        progress = (
            db.query(StudentProjectProgress)
            .filter(
                StudentProjectProgress.user_id == user_id,
                StudentProjectProgress.project_id == project_id,
            )
            .first()
        )

        now = datetime.utcnow()
        if not progress:
            progress = StudentProjectProgress(
                user_id=user_id,
                project_id=project_id,
                status=payload.status,
                completion_percentage=payload.completion_percentage,
                evidence_notes=payload.evidence_notes,
                submitted_at=now if payload.status in ["submitted", "completed"] else None,
                updated_at=now,
            )
            db.add(progress)
        else:
            progress.status = payload.status
            progress.completion_percentage = payload.completion_percentage
            if payload.evidence_notes:
                progress.evidence_notes = payload.evidence_notes
            if payload.status in ["submitted", "completed"] and not progress.submitted_at:
                progress.submitted_at = now
            progress.updated_at = now

        db.commit()
        db.refresh(progress)

        return StudentProjectProgressResponse(
            id=progress.id,
            project_id=project.id,
            project_title=project.title,
            difficulty=project.difficulty,
            status=progress.status,
            completion_percentage=progress.completion_percentage,
            evidence_notes=progress.evidence_notes,
            submitted_at=progress.submitted_at,
            updated_at=progress.updated_at,
        )

    @staticmethod
    def get_user_portfolio(db: Session, user_id: int) -> List[StudentProjectProgressResponse]:
        """Fetch all projects actively tracked by the student."""
        records = (
            db.query(StudentProjectProgress, Project)
            .join(Project, StudentProjectProgress.project_id == Project.id)
            .filter(StudentProjectProgress.user_id == user_id)
            .order_by(StudentProjectProgress.updated_at.desc())
            .all()
        )

        return [
            StudentProjectProgressResponse(
                id=prog.id,
                project_id=p.id,
                project_title=p.title,
                difficulty=p.difficulty,
                status=prog.status,
                completion_percentage=prog.completion_percentage,
                evidence_notes=prog.evidence_notes,
                submitted_at=prog.submitted_at,
                updated_at=prog.updated_at,
            )
            for prog, p in records
        ]
