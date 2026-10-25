"""Pydantic schemas for AI Tutor Conversations and Chat Messages."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class MessageCreateRequest(BaseModel):
    """Student prompt sent to AI Tutor."""
    content: str = Field(..., min_length=1, max_length=2000)
    use_rag: bool = Field(default=False, description="Whether to ground the response using educational documents")
    topic: Optional[str] = Field(default="general", max_length=100)


class MessageResponse(BaseModel):
    """Single message within a conversation."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    sender: str
    message_text: str
    sources_json: Optional[List[Dict[str, Any]]] = None
    is_fallback: bool
    created_at: datetime


class ConversationCreateRequest(BaseModel):
    """Initiates a new conversational session."""
    title: Optional[str] = Field(default=None, max_length=200)
    topic: Optional[str] = Field(default="general", max_length=100)


class ConversationResponse(BaseModel):
    """Conversation thread metadata."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    topic: Optional[str] = "general"
    created_at: datetime
    updated_at: datetime


class ConversationDetailResponse(ConversationResponse):
    """Conversation thread with complete historical messages."""
    messages: List[MessageResponse] = []


class TutorStatusResponse(BaseModel):
    """Operational status of AI Tutor backend."""
    ai_provider: str
    is_live_llm: bool
    fallback_available: bool
    model_name: Optional[str] = None
    daily_rate_limit: int
