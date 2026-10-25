"""Administrative audit log ORM model for compliance and observability."""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class AdminAuditLog(Base):
    """Audit trail recording actions executed by administrators and instructors."""

    __tablename__ = "admin_audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)  # e.g., 'skill_created', 'user_deactivated'
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    details_json = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    admin = relationship("User", back_populates="audit_logs")
