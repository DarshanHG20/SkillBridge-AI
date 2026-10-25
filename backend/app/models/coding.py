"""Coding Problem and Evaluation Submission ORM models."""

from datetime import datetime
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class CodingProblem(Base):
    """Algorithmic and software engineering coding exercise specification."""

    __tablename__ = "coding_problems"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(String(50), default="easy", nullable=False)  # 'easy', 'medium', 'hard'
    skill_slug = Column(String(100), nullable=False, index=True)
    starter_code = Column(Text, nullable=False)
    solution_template = Column(Text, nullable=True)
    test_cases_json = Column(JSON, nullable=False)  # List of {input, expected_output, is_hidden}
    hints_json = Column(JSON, nullable=True)  # List of progressive hint strings
    rubric_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    submissions = relationship("CodingSubmission", back_populates="problem", cascade="all, delete-orphan")


class CodingSubmission(Base):
    """Student coding attempt graded via isolated micro-sandbox or safe static analysis."""

    __tablename__ = "coding_submissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    problem_id = Column(Integer, ForeignKey("coding_problems.id", ondelete="CASCADE"), nullable=False, index=True)
    submitted_code = Column(Text, nullable=False)
    status = Column(String(50), default="pending", nullable=False)  # 'passed', 'failed', 'syntax_error', 'security_violation'
    tests_passed = Column(Integer, default=0, nullable=False)
    total_tests = Column(Integer, default=0, nullable=False)
    test_results_json = Column(JSON, nullable=True)
    static_analysis_feedback_json = Column(JSON, nullable=True)
    execution_mode = Column(String(50), default="safe_static_analysis", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User")
    problem = relationship("CodingProblem", back_populates="submissions")
