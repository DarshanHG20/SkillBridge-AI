"""AI Tutor package providing provider-independent LLM adapters and fallbacks."""

from app.ai.base import LLMMessage, LLMResponse, BaseLLMClient
from app.ai.adapter import LLMAdapter
from app.ai.fallback import DeterministicFallbackLLMClient
from app.ai.providers import MockLLMClient, OpenAILLMClient, GeminiLLMClient

__all__ = [
    "LLMMessage",
    "LLMResponse",
    "BaseLLMClient",
    "LLMAdapter",
    "DeterministicFallbackLLMClient",
    "MockLLMClient",
    "OpenAILLMClient",
    "GeminiLLMClient",
]
