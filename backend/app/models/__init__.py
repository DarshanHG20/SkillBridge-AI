"""ORM models package aggregating and registering all metadata."""

from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.user import User, StudentProfile
from app.models.skill import Skill, SkillPrerequisite, SkillMastery
from app.models.learner_activity import LearnerActivity
from app.models.audit import AdminAuditLog
from app.models.assessment import Assessment, Question, AssessmentAttempt, AssessmentResponse
from app.models.career import Career, CareerRequirement, Roadmap
from app.models.project import Project, StudentProjectProgress
from app.models.rag_document import Document, DocumentChunk
from app.models.chat import ChatConversation, ChatMessage
from app.models.coding import CodingProblem, CodingSubmission
from app.models.feedback import Feedback

__all__ = [
    "Base",
    "TimestampMixin",
    "User",
    "StudentProfile",
    "Skill",
    "SkillPrerequisite",
    "SkillMastery",
    "LearnerActivity",
    "AdminAuditLog",
    "Assessment",
    "Question",
    "AssessmentAttempt",
    "AssessmentResponse",
    "Career",
    "CareerRequirement",
    "Roadmap",
    "Project",
    "StudentProjectProgress",
    "Document",
    "DocumentChunk",
    "ChatConversation",
    "ChatMessage",
    "CodingProblem",
    "CodingSubmission",
    "Feedback",
]
