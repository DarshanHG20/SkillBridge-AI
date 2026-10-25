"""Provider-independent LLM Adapter with rate limiting, timeouts, and transparent fallback."""

from datetime import datetime, date
import logging
from typing import Dict, List, Optional
from fastapi import HTTPException, status

from app.core.config import get_settings
from app.ai.base import BaseLLMClient, LLMMessage, LLMResponse
from app.ai.fallback import DeterministicFallbackLLMClient
from app.ai.providers import MockLLMClient, OpenAILLMClient, GeminiLLMClient


logger = logging.getLogger(__name__)


class LLMAdapter:
    """Unified LLM orchestrator handling client factory, rate limiting, and fallback resilience."""

    # In-memory daily request tracking {user_id: {date: count}}
    _daily_usage: Dict[int, Dict[date, int]] = {}

    @classmethod
    def get_client(cls, override_provider: Optional[str] = None) -> BaseLLMClient:
        """Instantiate configured LLM provider or fallback client."""
        settings = get_settings()
        provider = (override_provider or settings.AI_PROVIDER).lower()

        if provider == "mock":
            return MockLLMClient()
        elif provider == "openai" and settings.OPENAI_API_KEY:
            return OpenAILLMClient(
                api_key=settings.OPENAI_API_KEY,
                model=settings.OPENAI_MODEL,
                timeout_seconds=settings.LLM_TIMEOUT_SECONDS,
            )
        elif provider == "gemini" and settings.GEMINI_API_KEY:
            return GeminiLLMClient(
                api_key=settings.GEMINI_API_KEY,
                model=settings.GEMINI_MODEL,
                timeout_seconds=settings.LLM_TIMEOUT_SECONDS,
            )
        else:
            return DeterministicFallbackLLMClient()

    @classmethod
    def check_and_increment_rate_limit(cls, user_id: int) -> int:
        """Enforce configurable per-user daily usage limits."""
        settings = get_settings()
        today = datetime.utcnow().date()

        if user_id not in cls._daily_usage:
            cls._daily_usage[user_id] = {}

        current_count = cls._daily_usage[user_id].get(today, 0)
        if current_count >= settings.TUTOR_DAILY_RATE_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Daily AI tutor query limit of {settings.TUTOR_DAILY_RATE_LIMIT} requests exceeded. Please try again tomorrow.",
            )

        cls._daily_usage[user_id][today] = current_count + 1
        return cls._daily_usage[user_id][today]

    @classmethod
    def complete_chat(
        cls,
        messages: List[LLMMessage],
        system_prompt: Optional[str] = None,
        user_id: Optional[int] = None,
        override_client: Optional[BaseLLMClient] = None,
    ) -> LLMResponse:
        """Execute chat completion with transparent fallback on error, timeout, or missing config."""
        settings = get_settings()

        # Enforce usage limits
        if user_id:
            cls.check_and_increment_rate_limit(user_id)

        client = override_client or cls.get_client()

        try:
            return client.generate_chat_completion(
                messages=messages,
                system_prompt=system_prompt,
                temperature=settings.LLM_TEMPERATURE,
                max_tokens=settings.LLM_MAX_TOKENS,
            )
        except Exception as exc:
            logger.warning(
                f"Configured LLM client failed ({type(exc).__name__}: {exc}). "
                "Engaging deterministic rule-based fallback engine."
            )
            fallback_client = DeterministicFallbackLLMClient()
            fallback_resp = fallback_client.generate_chat_completion(
                messages=messages,
                system_prompt=system_prompt,
            )
            return fallback_resp
