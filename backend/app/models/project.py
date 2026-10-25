"""Project-based learning and student portfolio tracking ORM models."""

from datetime import datetime
from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class Project(Base):
    """Real-world project template with milestones, rubrics, and prerequisites."""

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(String(50), default="beginner", nullable=False)  # 'beginner', 'intermediate', 'advanced'
    rubric_json = Column(JSON, nullable=False)  # Evaluation criteria
    milestones_json = Column(JSON, nullable=False)  # Step-by-step deliverable tasks
    recommended_skills_json = Column(JSON, nullable=True)  # List of skill slugs or IDs
    career_id = Column(Integer, ForeignKey("careers.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    career = relationship("Career")
    student_progress = relationship("StudentProjectProgress", back_populates="project", cascade="all, delete-orphan")


class StudentProjectProgress(Base):
    """Student progress record for an active or completed hands-on project."""

    __tablename__ = "student_project_progress"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="in_progress", nullable=False)  # 'in_progress', 'submitted', 'completed'
    completion_percentage = Column(Float, default=0.0, nullable=False)
    evidence_notes = Column(Text, nullable=True)  # Student notes, repository links, or demo URLs
    submitted_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User")
    project = relationship("Project", back_populates="student_progress")
