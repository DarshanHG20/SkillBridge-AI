"""Version 1 API router consolidating all domain endpoint sub-routers."""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    admin,
    auth,
    health,
    users,
    skills,
    assessments,
    adaptive,
    careers,
    projects,
    tutor,
    rag,
    chat,
    coding,
    feedback,
)

api_router = APIRouter()

# Register endpoint sub-routers
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(admin.router, prefix="/admin", tags=["Administration"])
api_router.include_router(skills.router, prefix="/skills", tags=["Skills Taxonomy"])
api_router.include_router(assessments.router, prefix="/assessments", tags=["Assessments"])
api_router.include_router(adaptive.router, prefix="/adaptive", tags=["Adaptive Learning Engine"])
api_router.include_router(careers.router, prefix="/careers", tags=["Career Intelligence"])
api_router.include_router(projects.router, prefix="/projects", tags=["Project-Based Learning"])
api_router.include_router(tutor.router, prefix="/tutor", tags=["AI Tutor"])
api_router.include_router(rag.router, prefix="/rag", tags=["RAG Knowledge Pipeline"])
api_router.include_router(chat.router, prefix="/chat", tags=["Learning Chatbot"])
api_router.include_router(coding.router, prefix="/coding", tags=["Coding Practice"])
api_router.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])

