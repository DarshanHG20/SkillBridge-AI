"""Career, CareerRequirement, and Personalized Roadmap ORM models."""

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
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class Career(Base):
    """Target professional career pathway (e.g. Backend Engineer, Data Scientist)."""

    __tablename__ = "careers"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    average_salary_range = Column(String(100), nullable=True)
    industry = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    requirements = relationship("CareerRequirement", back_populates="career", cascade="all, delete-orphan")
    roadmaps = relationship("Roadmap", back_populates="career")


class CareerRequirement(Base):
    """Skill requirement for a specific career path with minimum mastery and weight."""

    __tablename__ = "career_requirements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    career_id = Column(Integer, ForeignKey("careers.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    minimum_mastery_level = Column(Float, default=0.8, nullable=False)
    weight = Column(Float, default=1.0, nullable=False)

    __table_args__ = (
        UniqueConstraint("career_id", "skill_id", name="uq_career_skill"),
    )

    # Relationships
    career = relationship("Career", back_populates="requirements")
    skill = relationship("Skill")


class Roadmap(Base):
    """Personalized learning plan (30/60/90 days or custom) tailored to learner's career goal."""

    __tablename__ = "roadmaps"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    career_id = Column(Integer, ForeignKey("careers.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    plan_type = Column(String(50), default="90_day", nullable=False)  # '30_day', '60_day', '90_day'
    milestones_json = Column(JSON, nullable=False)
    completion_percentage = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User")
    career = relationship("Career", back_populates="roadmaps")
