"""Unit tests for configuration validation and environment parsing."""

from app.core.config import Settings


def test_default_settings():
    """Verify default settings load cleanly with expected fallback values."""
    settings = Settings()
    assert settings.PROJECT_NAME == "SkillBridge AI"
    assert settings.API_V1_STR == "/api/v1"
    assert settings.DEFAULT_MASTERY_THRESHOLD == 0.75
    assert isinstance(settings.CORS_ORIGINS, list)
    assert len(settings.CORS_ORIGINS) > 0


def test_cors_origins_parsing_from_string():
    """Verify CORS_ORIGINS parser supports comma-separated string inputs."""
    settings = Settings(CORS_ORIGINS="https://example.com, https://app.example.com")
    assert "https://example.com" in settings.CORS_ORIGINS
    assert "https://app.example.com" in settings.CORS_ORIGINS
    assert len(settings.CORS_ORIGINS) == 2


def test_cors_origins_parsing_from_json_string():
    """Verify CORS_ORIGINS parser supports JSON array string inputs."""
    settings = Settings(CORS_ORIGINS='["https://skillbridge.dev", "https://admin.skillbridge.dev"]')
    assert settings.CORS_ORIGINS == ["https://skillbridge.dev", "https://admin.skillbridge.dev"]
