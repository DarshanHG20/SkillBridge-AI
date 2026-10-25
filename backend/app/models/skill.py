"""Skill taxonomy, prerequisite graph, and skill mastery ORM models."""

from datetime import datetime
from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Skill(Base, TimestampMixin):
    """Core skill node in the adaptive knowledge taxonomy."""

    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(150), nullable=False)
    category = Column(String(100), index=True, nullable=False)
    description = Column(Text, nullable=True)
    difficulty_level = Column(String(50), default="beginner", nullable=False)

    # Relationships
    prerequisites = relationship(
        "SkillPrerequisite",
        foreign_keys="[SkillPrerequisite.skill_id]",
        back_populates="skill",
        cascade="all, delete-orphan",
    )
    dependent_skills = relationship(
        "SkillPrerequisite",
        foreign_keys="[SkillPrerequisite.prerequisite_skill_id]",
        back_populates="prerequisite_skill",
    )
    mastery_records = relationship("SkillMastery", back_populates="skill", cascade="all, delete-orphan")


class SkillPrerequisite(Base):
    """Directed edge in the skill prerequisite graph."""

    __tablename__ = "skill_prerequisites"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    prerequisite_skill_id = Column(
        Integer,
        ForeignKey("skills.id", ondelete="RESTRICT"),
        nullable=False,
    )
    requirement_type = Column(String(50), default="mandatory", nullable=False)  # 'mandatory', 'recommended'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("skill_id", "prerequisite_skill_id", name="uq_skill_prereq"),
    )

    # Relationships
    skill = relationship("Skill", foreign_keys=[skill_id], back_populates="prerequisites")
    prerequisite_skill = relationship("Skill", foreign_keys=[prerequisite_skill_id], back_populates="dependent_skills")


class SkillMastery(Base, TimestampMixin):
    """Learner competency level per skill updated by the adaptive engine."""

    __tablename__ = "skill_mastery"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    mastery_score = Column(Float, default=0.0, nullable=False)  # 0.0 to 1.0
    confidence_score = Column(Float, default=0.5, nullable=False)
    status = Column(String(50), default="unlocked", nullable=False)  # 'locked', 'unlocked', 'in_progress', 'mastered'
    last_practiced_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "skill_id", name="uq_user_skill_mastery"),
    )

    # Relationships
    user = relationship("User", back_populates="mastery_records")
    skill = relationship("Skill", back_populates="mastery_records")
