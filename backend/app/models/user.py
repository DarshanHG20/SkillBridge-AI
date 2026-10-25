"""User and Student Profile SQLAlchemy ORM models."""

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class User(Base, TimestampMixin):
    """User account entity for students, instructors, and administrators."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(50), nullable=False, default="student")  # 'student', 'instructor', 'admin', 'superadmin'
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Relationships
    profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    mastery_records = relationship("SkillMastery", back_populates="user", cascade="all, delete-orphan")
    activities = relationship("LearnerActivity", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AdminAuditLog", back_populates="admin")


class StudentProfile(Base, TimestampMixin):
    """Extended learner profile containing learning goals and preferences."""

    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    headline = Column(String(200), nullable=True)
    bio = Column(Text, nullable=True)
    target_role = Column(String(150), nullable=True)
    education_level = Column(String(100), nullable=True)
    target_hours_per_week = Column(Integer, default=10, nullable=False)
    preferred_learning_style = Column(String(50), default="visual", nullable=False)

    # Relationships
    user = relationship("User", back_populates="profile")
