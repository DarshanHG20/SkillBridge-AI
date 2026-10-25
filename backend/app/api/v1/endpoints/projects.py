"""Hands-on project templates and student portfolio endpoints."""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user, get_optional_current_user
from app.models.user import User
from app.schemas.project import (
    ProjectResponse,
    ProjectProgressUpdateRequest,
    StudentProjectProgressResponse,
)
from app.services.project_service import ProjectService


router = APIRouter()


@router.get("", response_model=List[ProjectResponse], summary="List all project templates")
def list_projects(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    """Retrieve catalog of hands-on project templates with rubrics, milestones, and enrollment status."""
    user_id = current_user.id if current_user else None
    return ProjectService.list_projects(db, user_id=user_id)


@router.get("/my-portfolio", response_model=List[StudentProjectProgressResponse], summary="Get student project portfolio")
def get_my_portfolio(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve all hands-on projects actively tracked or completed by the student."""
    return ProjectService.get_user_portfolio(db, user_id=current_user.id)


@router.get("/{project_id}", response_model=ProjectResponse, summary="Get project template details")
def get_project_details(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    """Fetch project details, evaluation rubrics, and deliverable milestones."""
    user_id = current_user.id if current_user else None
    return ProjectService.get_project_by_id(db, project_id=project_id, user_id=user_id)


@router.post("/{project_id}/progress", response_model=StudentProjectProgressResponse, summary="Update project progress")
def update_project_progress(
    project_id: int,
    payload: ProjectProgressUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Enroll in a project, advance milestone completion, or submit verification evidence notes."""
    return ProjectService.update_project_progress(
        db=db,
        user_id=current_user.id,
        project_id=project_id,
        payload=payload,
    )
