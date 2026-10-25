"""Assessment, Question, Attempt, and Response ORM models."""

from datetime import datetime
from sqlalchemy import (
    Boolean,
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


class Assessment(Base):
    """Assessment container linked to a target skill or concept."""

    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_type = Column(String(50), default="formative", nullable=False)  # 'diagnostic', 'formative', 'summative'
    pass_percentage = Column(Float, default=75.0, nullable=False)
    time_limit_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    skill = relationship("Skill")
    questions = relationship("Question", back_populates="assessment", cascade="all, delete-orphan")
    attempts = relationship("AssessmentAttempt", back_populates="assessment", cascade="all, delete-orphan")


class Question(Base):
    """Question item with options, correct answer key, and diagnostic explanation."""

    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    prompt = Column(Text, nullable=False)
    question_type = Column(String(50), default="single_choice", nullable=False)
    options_json = Column(JSON, nullable=False)  # List of option strings or objects
    correct_answer_json = Column(JSON, nullable=False)  # e.g., ["option_index"] or "A"
    explanation = Column(Text, nullable=True)  # Conceptual diagnostic rationale
    difficulty = Column(String(50), default="medium", nullable=False)  # 'easy', 'medium', 'hard'
    points = Column(Integer, default=10, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    assessment = relationship("Assessment", back_populates="questions")
    responses = relationship("AssessmentResponse", back_populates="question", cascade="all, delete-orphan")


class AssessmentAttempt(Base):
    """Student assessment session record storing scores, completion state, and timing."""

    __tablename__ = "assessment_attempts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    score_achieved = Column(Float, default=0.0, nullable=False)
    is_passed = Column(Boolean, default=False, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    assessment = relationship("Assessment", back_populates="attempts")
    user = relationship("User")
    responses = relationship("AssessmentResponse", back_populates="attempt", cascade="all, delete-orphan")


class AssessmentResponse(Base):
    """Individual question answer submitted by a student with diagnostic feedback."""

    __tablename__ = "assessment_responses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    attempt_id = Column(Integer, ForeignKey("assessment_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    learner_response_json = Column(JSON, nullable=False)
    is_correct = Column(Boolean, nullable=False)
    time_spent_seconds = Column(Integer, default=0, nullable=False)
    diagnostic_feedback = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    attempt = relationship("AssessmentAttempt", back_populates="responses")
    question = relationship("Question", back_populates="responses")
