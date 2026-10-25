"""Student Feedback and Platform Issue Reporting ORM model."""

from datetime import datetime
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class Feedback(Base):
    """Feedback submitted by learners regarding course content, assessments, or bugs."""

    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(50), default="general", nullable=False)  # 'content', 'bug', 'suggestion', 'general'
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(50), default="pending", nullable=False)  # 'pending', 'reviewed', 'resolved'
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User")
