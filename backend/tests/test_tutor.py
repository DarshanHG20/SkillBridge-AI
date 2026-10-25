"""Tests for AI Tutor subsystem, provider independence, rate limits, and deterministic fallback."""

from datetime import datetime
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.ai.adapter import LLMAdapter
from app.ai.base import LLMMessage
from app.ai.fallback import DeterministicFallbackLLMClient


def test_tutor_status_endpoint(client: TestClient):
    """Verify tutor status reports provider mode and fallback availability."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "tutor_status@example.com", "full_name": "Tutor Status User", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/v1/tutor/status", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "ai_provider" in data
    assert data["fallback_available"] is True
    assert "daily_rate_limit" in data


def test_missing_llm_config_returns_deterministic_fallback(client: TestClient):
    """Verify missing LLM credentials transparently activate deterministic fallback with explicit notice."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "fallback_student@example.com", "full_name": "Fallback Student", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Query with default configuration (AI_PROVIDER='none')
    response = client.post(
        "/api/v1/tutor/query",
        headers=headers,
        json={"prompt": "Explain what is binary search and its time complexity."},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_fallback"] is True
    assert "binary search" in data["content"].lower()
    assert "O(log N)" in data["content"] or "logarithmic" in data["content"].lower()
    assert data["provider"] == "deterministic_fallback"


def test_llm_timeout_or_error_activates_fallback():
    """Verify client timeouts or provider exceptions trigger the deterministic fallback engine."""
    broken_client = MagicMock()
    broken_client.generate_chat_completion.side_effect = TimeoutError("Simulated LLM Gateway Timeout")

    messages = [LLMMessage(role="user", content="Explain Python list comprehension")]

    result = LLMAdapter.complete_chat(
        messages=messages,
        override_client=broken_client,
    )

    assert result.is_fallback is True
    assert result.provider == "deterministic_fallback"
    assert "comprehension" in result.content.lower()


def test_tutor_rate_limiting(client: TestClient):
    """Verify that daily tutor usage rate limits are strictly enforced."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "ratelimit_user@example.com", "full_name": "Rate Limit User", "password": "Password123!"},
    )
    user_id = reg.json()["user"]["id"]
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    today = datetime.utcnow().date()
    settings = get_settings()

    # Pre-populate usage to maximum daily limit
    LLMAdapter._daily_usage[user_id] = {today: settings.TUTOR_DAILY_RATE_LIMIT}

    # Next request must return HTTP 429
    res = client.post("/api/v1/tutor/query", headers=headers, json={"prompt": "Next question"})
    assert res.status_code == 429
    assert "Daily AI tutor query limit" in res.json()["detail"]


def test_deterministic_fallback_refuses_to_hallucinate():
    """Verify deterministic fallback clearly identifies its rule-based nature for unmapped topics."""
    client = DeterministicFallbackLLMClient()
    messages = [LLMMessage(role="user", content="Random obscure query xyz123456789")]
    resp = client.generate_chat_completion(messages)

    assert resp.is_fallback is True
    assert "[SkillBridge Deterministic Fallback Active" in resp.content
