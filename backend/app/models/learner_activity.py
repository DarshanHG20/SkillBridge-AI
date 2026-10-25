"""Learner activity telemetry and event logging ORM model."""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class LearnerActivity(Base):
    """Event log capturing learner interactions, quiz completions, and milestones."""

    __tablename__ = "learner_activity"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    activity_type = Column(String(50), nullable=False, index=True)  # e.g., 'assessment_completed', 'streak_logged'
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="activities")
