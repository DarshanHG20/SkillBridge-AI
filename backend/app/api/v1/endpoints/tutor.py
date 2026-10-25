"""AI Tutor endpoints providing pedagogical assistance, status, and fallback operations."""

import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.deps import get_current_active_user
from app.models.user import User
from app.core.config import get_settings
from app.ai.adapter import LLMAdapter
from app.ai.base import LLMMessage
from app.schemas.chat import TutorStatusResponse


logger = logging.getLogger(__name__)
router = APIRouter()


class DirectTutorQueryRequest(BaseModel):
    prompt: str = Field(..., min_length=2, max_length=2000, description="Student question or query")
    skill_context: Optional[str] = Field(default=None, max_length=100)


class DirectTutorQueryResponse(BaseModel):
    content: str
    is_fallback: bool
    provider: str
    model: str
    tokens_used: int


@router.get("/status", response_model=TutorStatusResponse, summary="Get AI Tutor operational status")
def get_tutor_status(
    current_user: User = Depends(get_current_active_user),
):
    """Returns current AI configuration, provider name, and deterministic fallback status."""
    settings = get_settings()
    client = LLMAdapter.get_client()
    return TutorStatusResponse(
        ai_provider=settings.AI_PROVIDER,
        is_live_llm=settings.AI_PROVIDER in {"openai", "gemini", "mock"},
        fallback_available=True,
        model_name=getattr(client, "model", "deterministic_fallback"),
        daily_rate_limit=settings.TUTOR_DAILY_RATE_LIMIT,
    )


@router.post("/query", response_model=DirectTutorQueryResponse, summary="Query AI Tutor directly")
def query_tutor(
    payload: DirectTutorQueryRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Direct query to the AI Tutor with rate-limiting, error handling, and deterministic fallback."""
    system_prompt = (
        "You are SkillBridge AI Tutor, a patient, encouraging educational mentor. "
        "Explain concepts clearly, provide practical examples, and guide students with constructive hints."
    )
    if payload.skill_context:
        system_prompt += f" The current study context is '{payload.skill_context}'."

    messages = [
        LLMMessage(role="user", content=payload.prompt),
    ]

    response = LLMAdapter.complete_chat(
        messages=messages,
        system_prompt=system_prompt,
        user_id=current_user.id,
    )

    return DirectTutorQueryResponse(
        content=response.content,
        is_fallback=response.is_fallback,
        provider=response.provider,
        model=response.model,
        tokens_used=response.tokens_used,
    )
