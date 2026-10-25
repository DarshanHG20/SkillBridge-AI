"""Base abstractions and data structures for provider-independent LLM adapters."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class LLMMessage(BaseModel):
    """Normalized chat message structure."""
    role: str = Field(..., pattern="^(system|user|assistant)$")
    content: str


class LLMResponse(BaseModel):
    """Standardized response schema returned across all LLM providers."""
    content: str
    provider: str
    model: str
    is_fallback: bool = False
    tokens_used: int = 0
    finish_reason: str = "stop"
    raw_metadata: Optional[Dict[str, Any]] = None


class BaseLLMClient(ABC):
    """Abstract interface for LLM providers."""

    @abstractmethod
    def generate_chat_completion(
        self,
        messages: List[LLMMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1000,
    ) -> LLMResponse:
        """Synchronously generate response from LLM provider or fallback."""
        pass
