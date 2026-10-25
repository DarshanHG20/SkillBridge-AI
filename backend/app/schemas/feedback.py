"""Pydantic schemas for Student Feedback and Issue Reporting."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class FeedbackCreateRequest(BaseModel):
    """Payload submitted by a learner for feedback or bug report."""
    category: str = Field(default="general", pattern="^(general|content|bug|bug_report|suggestion)$")
    title: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=10, max_length=5000)


class FeedbackStatusUpdateRequest(BaseModel):
    """Payload used by administrators to update feedback review state."""
    status: str = Field(..., pattern="^(pending|reviewed|resolved)$")
    admin_notes: Optional[str] = Field(default=None, max_length=2000)


class FeedbackResponse(BaseModel):
    """Public representation of feedback record."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    category: str
    title: str
    message: str
    status: str
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class FeedbackListResponse(BaseModel):
    """Paginated collection of feedback items."""
    items: List[FeedbackResponse]
    total: int
    skip: int
    limit: int
