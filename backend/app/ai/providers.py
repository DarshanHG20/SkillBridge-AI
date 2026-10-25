"""External and mock LLM provider implementations."""

import logging
from typing import Any, Dict, List, Optional
import httpx

from app.ai.base import BaseLLMClient, LLMMessage, LLMResponse


logger = logging.getLogger(__name__)


class MockLLMClient(BaseLLMClient):
    """Deterministic mock provider for unit testing without external network dependencies."""

    def __init__(self, response_text: Optional[str] = None, should_fail: bool = False, should_timeout: bool = False):
        self.response_text = response_text or "Mock AI Tutor response: Focus on data structures and algorithms."
        self.should_fail = should_fail
        self.should_timeout = should_timeout

    def generate_chat_completion(
        self,
        messages: List[LLMMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1000,
    ) -> LLMResponse:
        if self.should_timeout:
            raise httpx.TimeoutException("Mock client simulated network timeout.")
        if self.should_fail:
            raise RuntimeError("Mock client simulated API service failure.")

        return LLMResponse(
            content=self.response_text,
            provider="mock",
            model="mock-tutor-v1",
            is_fallback=False,
            tokens_used=len(self.response_text.split()),
        )


class OpenAILLMClient(BaseLLMClient):
    """Adapter for OpenAI-compatible chat completion APIs."""

    def __init__(self, api_key: str, model: str = "gpt-4o-mini", timeout_seconds: float = 10.0):
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds

    def generate_chat_completion(
        self,
        messages: List[LLMMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1000,
    ) -> LLMResponse:
        payload_messages = []
        if system_prompt:
            payload_messages.append({"role": "system", "content": system_prompt})
        for m in messages:
            payload_messages.append({"role": m.role, "content": m.content})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": self.model,
            "messages": payload_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        with httpx.Client(timeout=self.timeout_seconds) as client:
            resp = client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()
            choice = data["choices"][0]
            content = choice["message"]["content"]
            tokens = data.get("usage", {}).get("total_tokens", 0)

            return LLMResponse(
                content=content,
                provider="openai",
                model=self.model,
                is_fallback=False,
                tokens_used=tokens,
                finish_reason=choice.get("finish_reason", "stop"),
                raw_metadata=data.get("usage"),
            )


class GeminiLLMClient(BaseLLMClient):
    """Adapter for Google Gemini API."""

    def __init__(self, api_key: str, model: str = "gemini-1.5-flash", timeout_seconds: float = 10.0):
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds

    def generate_chat_completion(
        self,
        messages: List[LLMMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1000,
    ) -> LLMResponse:
        contents = []
        for m in messages:
            role = "user" if m.role in ["user", "system"] else "model"
            contents.append({"role": role, "parts": [{"text": m.content}]})

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        body: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        if system_prompt:
            body["systemInstruction"] = {"parts": [{"text": system_prompt}]}

        with httpx.Client(timeout=self.timeout_seconds) as client:
            resp = client.post(url, json=body)
            resp.raise_for_status()
            data = resp.json()
            candidate = data["candidates"][0]
            content = candidate["content"]["parts"][0]["text"]
            tokens = data.get("usageMetadata", {}).get("totalTokenCount", 0)

            return LLMResponse(
                content=content,
                provider="gemini",
                model=self.model,
                is_fallback=False,
                tokens_used=tokens,
                finish_reason=candidate.get("finishReason", "stop"),
            )
