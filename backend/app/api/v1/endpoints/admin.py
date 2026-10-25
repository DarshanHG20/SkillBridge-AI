"""Comprehensive Administrative Endpoints: Users, Content Management, Analytics, Audit Logs, and CSV Export."""

from datetime import datetime
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.audit import AdminAuditLog
from app.models.user import User
from app.models.skill import Skill, SkillPrerequisite
from app.models.assessment import Assessment, Question
from app.models.career import Career, CareerRequirement
from app.models.project import Project
from app.models.rag_document import Document
from app.models.feedback import Feedback
from app.schemas.user import UserListResponse, UserResponse, UserStatusUpdate
from app.schemas.feedback import FeedbackListResponse, FeedbackResponse, FeedbackStatusUpdateRequest
from app.schemas.admin_analytics import (
    AdminAnalyticsResponse,
    AdminAuditLogListResponse,
    AdminAuditLogResponse,
)
from app.services.analytics_service import AnalyticsService
from app.rag.service import RAGService


logger = logging.getLogger(__name__)
router = APIRouter()


class RoleUpdateRequest(BaseModel):
    role: str = Field(..., pattern="^(student|instructor|admin)$")


class DocumentApprovalRequest(BaseModel):
    is_approved: bool


class SkillAdminCreateRequest(BaseModel):
    slug: str = Field(..., max_length=100)
    title: str = Field(..., max_length=150)
    category: str = Field(..., max_length=100)
    description: Optional[str] = None
    difficulty_level: str = Field("beginner", pattern="^(beginner|intermediate|advanced)$")


class AssessmentAdminCreateRequest(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    skill_id: int
    assessment_type: str = Field("diagnostic", pattern="^(diagnostic|formative|summative)$")
    pass_percentage: float = Field(70.0, ge=0.0, le=100.0)
    time_limit_minutes: Optional[int] = Field(None, ge=1, le=180)


class QuestionAdminCreateRequest(BaseModel):
    prompt: str = Field(...)
    question_type: str = Field("single_choice", pattern="^(single_choice|multiple_choice|code_analysis)$")
    options_json: List[str] = Field(...)
    correct_answer_json: Any = Field(...)
    explanation: Optional[str] = None
    difficulty: str = Field("medium", pattern="^(easy|medium|hard)$")
    points: int = Field(10, ge=1, le=100)


class CareerAdminCreateRequest(BaseModel):
    slug: str = Field(..., max_length=100)
    title: str = Field(..., max_length=150)
    description: Optional[str] = None
    average_salary_range: Optional[str] = None
    industry: Optional[str] = None


class ProjectAdminCreateRequest(BaseModel):
    title: str = Field(..., max_length=200)
    description: str = Field(...)
    difficulty: str = Field("beginner", pattern="^(beginner|intermediate|advanced)$")
    rubric_json: Any = Field(...)
    milestones_json: Any = Field(...)
    recommended_skills_json: Optional[List[str]] = None
    career_id: Optional[int] = None



# ==============================================================================
# 1. USER MANAGEMENT & ROLE CONTROL
# ==============================================================================

@router.get("/users", response_model=UserListResponse, summary="List and filter users (Admin Only)")
def list_users(
    search: Optional[str] = Query(None, description="Search across email or full name"),
    role: Optional[str] = Query(None, description="Filter by role: student, instructor, admin"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Page limit"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> UserListResponse:
    query = db.query(User)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(or_(User.email.ilike(search_term), User.full_name.ilike(search_term)))
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    total = query.count()
    items = query.order_by(User.id.desc()).offset(skip).limit(limit).all()

    return UserListResponse(
        items=[UserResponse.model_validate(u) for u in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/users/{user_id}", response_model=UserResponse, summary="Get user details by ID (Admin Only)")
def get_user_detail(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> UserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(user)


@router.patch("/users/{user_id}/status", response_model=UserResponse, summary="Activate/Deactivate User Account")
def update_user_status(
    user_id: int,
    data: UserStatusUpdate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> UserResponse:
    if current_admin.id == user_id and not data.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own administrative account.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    prev_status = user.is_active
    user.is_active = data.is_active

    db.add(AdminAuditLog(
        admin_id=current_admin.id,
        action="user_status_changed",
        entity_type="user",
        entity_id=str(user.id),
        details_json={"previous_status": prev_status, "new_status": data.is_active, "target_email": user.email},
    ))
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.patch("/users/{user_id}/role", response_model=UserResponse, summary="Change User Role (Admin Only)")
def update_user_role(
    user_id: int,
    payload: RoleUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> UserResponse:
    if current_admin.id == user_id and payload.role != "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot revoke your own administrator role.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    old_role = user.role
    user.role = payload.role

    db.add(AdminAuditLog(
        admin_id=current_admin.id,
        action="user_role_changed",
        entity_type="user",
        entity_id=str(user.id),
        details_json={"old_role": old_role, "new_role": payload.role, "target_email": user.email},
    ))
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


# ==============================================================================
# 2. LEARNING CONTENT MANAGEMENT (SKILLS, ASSESSMENTS, CAREERS, PROJECTS)
# ==============================================================================

@router.post("/skills", status_code=status.HTTP_201_CREATED, summary="Create Skill in Taxonomy")
def create_skill(
    payload: SkillAdminCreateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(Skill).filter(Skill.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Skill with slug '{payload.slug}' already exists.")

    skill = Skill(
        slug=payload.slug,
        title=payload.title,
        category=payload.category,
        description=payload.description,
        difficulty_level=payload.difficulty_level,
    )
    db.add(skill)
    db.flush()

    db.add(AdminAuditLog(
        admin_id=current_admin.id,
        action="skill_created",
        entity_type="skill",
        entity_id=str(skill.id),
        details_json={"slug": skill.slug, "title": skill.title},
    ))
    db.commit()
    db.refresh(skill)
    return {"message": "Skill created successfully", "skill_id": skill.id, "slug": skill.slug}


@router.delete("/skills/{skill_id}", summary="Delete Skill from Taxonomy")
def delete_skill(
    skill_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    skill_slug = skill.slug
    db.delete(skill)
    db.add(AdminAuditLog(
        admin_id=current_admin.id,
        action="skill_deleted",
        entity_type="skill",
        entity_id=str(skill_id),
        details_json={"slug": skill_slug},
    ))
    db.commit()
    return {"message": f"Skill '{skill_slug}' deleted successfully."}


@router.post("/assessments", status_code=status.HTTP_201_CREATED, summary="Create Assessment")
def create_assessment(
    payload: AssessmentAdminCreateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    skill = db.query(Skill).filter(Skill.id == payload.skill_id).first()
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill associated with assessment not found")

    assessment = Assessment(
        title=payload.title,
        description=payload.description,
        skill_id=payload.skill_id,
        assessment_type=payload.assessment_type,
        pass_percentage=payload.pass_percentage,
        time_limit_minutes=payload.time_limit_minutes,
    )
    db.add(assessment)
    db.flush()

    db.add(AdminAuditLog(
        admin_id=current_admin.id,
        action="assessment_created",
        entity_type="assessment",
        entity_id=str(assessment.id),
        details_json={"title": assessment.title, "skill_id": assessment.skill_id},
    ))
    db.commit()
    db.refresh(assessment)
    return {"message": "Assessment created successfully", "assessment_id": assessment.id}


@router.delete("/assessments/{assessment_id}", summary="Delete Assessment")
def delete_assessment(
    assessment_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")

    db.delete(assessment)
    db.add(AdminAuditLog(
        admin_id=current_admin.id,
        action="assessment_deleted",
        entity_type="assessment",
        entity_id=str(assessment_id),
    ))
    db.commit()
    return {"message": f"Assessment #{assessment_id} deleted successfully."}


@router.post("/assessments/{assessment_id}/questions", status_code=status.HTTP_201_CREATED, summary="Add Question to Assessment")
def add_question(
    assessment_id: int,
    payload: QuestionAdminCreateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")

    question = Question(
        assessment_id=assessment_id,
        prompt=payload.prompt,
        question_type=payload.question_type,
        options_json=payload.options_json,
        correct_answer_json=payload.correct_answer_json,
        explanation=payload.explanation,
        difficulty=payload.difficulty,
        points=payload.points,
    )
    db.add(question)
    db.flush()

    db.add(AdminAuditLog(
        admin_id=current_admin.id,
        action="question_created",
        entity_type="question",
        entity_id=str(question.id),
        details_json={"assessment_id": assessment_id, "prompt_snippet": payload.prompt[:50]},
    ))
    db.commit()
    db.refresh(question)
    return {"message": "Question created successfully", "question_id": question.id}


@router.delete("/questions/{question_id}", summary="Delete Question from Assessment")
def delete_question(
    question_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    assessment_id = question.assessment_id
    db.delete(question)
    db.add(AdminAuditLog(
        admin_id=current_admin.id,
        action="question_deleted",
        entity_type="question",
        entity_id=str(question_id),
        details_json={"assessment_id": assessment_id},
    ))
    db.commit()
    return {"message": f"Question #{question_id} deleted successfully."}


@router.post("/careers", status_code=status.HTTP_201_CREATED, summary="Create Career Pathway")
def create_career(
    payload: CareerAdminCreateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(Career).filter(Career.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Career with slug '{payload.slug}' already exists.")

    career = Career(
        slug=payload.slug,
        title=payload.title,
        description=payload.description,
        average_salary_range=payload.average_salary_range,
        industry=payload.industry,
    )
    db.add(career)
    db.flush()

    db.add(AdminAuditLog(
        admin_id=current_admin.id,
        action="career_created",
        entity_type="career",
        entity_id=str(career.id),
        details_json={"slug": career.slug, "title": career.title},
    ))
    db.commit()
    db.refresh(career)
    return {"message": "Career pathway created successfully", "career_id": career.id, "slug": career.slug}


@router.delete("/careers/{career_id}", summary="Delete Career Pathway")
def delete_career(
    career_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    career = db.query(Career).filter(Career.id == career_id).first()
    if not career:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Career not found")

    career_slug = career.slug
    db.delete(career)
    db.add(AdminAuditLog(
        admin_id=current_admin.id,
        action="career_deleted",
        entity_type="career",
        entity_id=str(career_id),
        details_json={"slug": career_slug},
    ))
    db.commit()
    return {"message": f"Career '{career_slug}' deleted successfully."}


@router.post("/projects", status_code=status.HTTP_201_CREATED, summary="Create Hands-On Project Template")
def create_project_template(
    payload: ProjectAdminCreateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    project = Project(
        title=payload.title,
        description=payload.description,
        difficulty=payload.difficulty,
        rubric_json=payload.rubric_json,
        milestones_json=payload.milestones_json,
        recommended_skills_json=payload.recommended_skills_json,
        career_id=payload.career_id,
    )
    db.add(project)
    db.flush()

    db.add(AdminAuditLog(
        admin_id=current_admin.id,
        action="project_created",
        entity_type="project",
        entity_id=str(project.id),
        details_json={"title": project.title, "difficulty": project.difficulty},
    ))
    db.commit()
    db.refresh(project)
    return {"message": "Project template created successfully", "project_id": project.id}


@router.delete("/projects/{project_id}", summary="Delete Hands-On Project Template")
def delete_project_template(
    project_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project template not found")

    title = project.title
    db.delete(project)
    db.add(AdminAuditLog(
        admin_id=current_admin.id,
        action="project_deleted",
        entity_type="project",
        entity_id=str(project_id),
        details_json={"title": title},
    ))
    db.commit()
    return {"message": f"Project template '{title}' deleted successfully."}


# ==============================================================================
# 3. RAG EDUCATIONAL DOCUMENT APPROVAL
# ==============================================================================


@router.get("/documents", summary="List all documents with approval status")
def list_admin_documents(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    docs = db.query(Document).order_by(Document.id.desc()).all()
    return [
        {
            "id": d.id,
            "title": d.title,
            "filename": d.filename,
            "file_type": d.file_type,
            "file_size_bytes": d.file_size_bytes,
            "is_approved": d.is_approved,
            "chunk_count": d.chunk_count,
            "user_id": d.user_id,
            "created_at": d.created_at,
        }
        for d in docs
    ]


@router.patch("/documents/{document_id}/approval", summary="Approve or Reject Document for RAG Indexing")
def set_document_approval(
    document_id: int,
    payload: DocumentApprovalRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    doc.is_approved = payload.is_approved
    db.add(AdminAuditLog(
        admin_id=current_admin.id,
        action="document_approval_changed",
        entity_type="document",
        entity_id=str(doc.id),
        details_json={"title": doc.title, "is_approved": payload.is_approved},
    ))
    db.commit()

    # Synchronize vector index
    try:
        RAGService.rebuild_index(db)
    except Exception as exc:
        logger.warning("Could not synchronize vector index after approval update: %s", exc)

    return {"message": f"Document #{document_id} approval set to {payload.is_approved}."}


# ==============================================================================
# 4. STUDENT FEEDBACK & ISSUE REVIEW
# ==============================================================================

@router.get("/feedback", response_model=FeedbackListResponse, summary="List Student Feedback")
def list_feedback(
    category: Optional[str] = Query(None, description="Filter by feedback category"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by review status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Feedback)
    if category:
        query = query.filter(Feedback.category == category)
    if status_filter:
        query = query.filter(Feedback.status == status_filter)

    total = query.count()
    items = query.order_by(Feedback.created_at.desc()).offset(skip).limit(limit).all()

    return FeedbackListResponse(
        items=[FeedbackResponse.model_validate(f) for f in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.patch("/feedback/{feedback_id}/status", response_model=FeedbackResponse, summary="Update Feedback Review Status")
def update_feedback_status(
    feedback_id: int,
    payload: FeedbackStatusUpdateRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback item not found")

    fb.status = payload.status
    if payload.admin_notes is not None:
        fb.admin_notes = payload.admin_notes

    db.add(AdminAuditLog(
        admin_id=current_admin.id,
        action="feedback_status_updated",
        entity_type="feedback",
        entity_id=str(fb.id),
        details_json={"status": payload.status},
    ))
    db.commit()
    db.refresh(fb)
    return FeedbackResponse.model_validate(fb)


# ==============================================================================
# 5. LEARNING ANALYTICS & TELEMETRY
# ==============================================================================

@router.get("/analytics", response_model=AdminAnalyticsResponse, summary="Get Platform Learning Analytics")
def get_analytics(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Computes verified aggregated platform engagement and learning metrics with insufficient-data labels."""
    return AnalyticsService.get_admin_analytics(db)


# ==============================================================================
# 6. COMPLIANCE AUDIT LOGS
# ==============================================================================

@router.get("/audit-logs", response_model=AdminAuditLogListResponse, summary="Query Admin Audit Logs")
def get_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action code"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(AdminAuditLog)
    if action:
        query = query.filter(AdminAuditLog.action == action)
    if entity_type:
        query = query.filter(AdminAuditLog.entity_type == entity_type)

    total = query.count()
    logs = query.order_by(AdminAuditLog.id.desc()).offset(skip).limit(limit).all()

    items = []
    for l in logs:
        admin_user = db.query(User).filter(User.id == l.admin_id).first()
        items.append(
            AdminAuditLogResponse(
                id=l.id,
                admin_id=l.admin_id,
                admin_email=admin_user.email if admin_user else None,
                action=l.action,
                entity_type=l.entity_type,
                entity_id=l.entity_id,
                details_json=l.details_json,
                ip_address=l.ip_address,
                created_at=l.created_at,
            )
        )

    return AdminAuditLogListResponse(items=items, total=total, skip=skip, limit=limit)


# ==============================================================================
# 7. CSV REPORT EXPORTS
# ==============================================================================

@router.get("/export/users.csv", summary="Export Users to CSV")
def export_users_csv(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    csv_data = AnalyticsService.export_users_csv(db)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=skillbridge_users.csv"},
    )


@router.get("/export/assessment-attempts.csv", summary="Export Assessment Results to CSV")
def export_assessments_csv(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    csv_data = AnalyticsService.export_assessment_attempts_csv(db)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=skillbridge_assessment_attempts.csv"},
    )


@router.get("/export/audit-logs.csv", summary="Export Compliance Audit Logs to CSV")
def export_audit_logs_csv(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    csv_data = AnalyticsService.export_audit_logs_csv(db)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=skillbridge_audit_logs.csv"},
    )
