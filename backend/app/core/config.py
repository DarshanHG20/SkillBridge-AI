"""Application configuration settings loaded from environment variables."""

import json
from functools import lru_cache
from typing import Any, List, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Core application settings with environment variable overrides."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # General
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PROJECT_NAME: str = "SkillBridge AI"
    API_V1_STR: str = "/api/v1"

    # Security & Tokens
    SECRET_KEY: str = "change_in_production_minimum_32_characters_secret_key_skillbridge_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    # Default is SQLite for instant out-of-the-box local testing.
    # Production / Dev with MySQL: mysql+pymysql://user:pass@localhost:3306/skillbridge_db
    DATABASE_URL: str = "sqlite:///./skillbridge_dev.db"
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_ECHO: bool = False

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]], **kwargs: Any) -> List[str]:
        """Parse CORS_ORIGINS from JSON string or comma-separated string if provided via env."""
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []

    # Server Binding
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Adaptive Learning Engine
    AI_ADAPTIVE_ENGINE_ENABLED: bool = True
    DEFAULT_MASTERY_THRESHOLD: float = 0.75
    MINIMUM_QUESTIONS_PER_ASSESSMENT: int = 5

    # AI Tutor & Provider-Independent LLM Configuration
    AI_PROVIDER: str = "none"  # 'none', 'mock', 'openai', 'gemini'
    OPENAI_API_KEY: Union[str, None] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    GEMINI_API_KEY: Union[str, None] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"
    LLM_TIMEOUT_SECONDS: float = 10.0
    LLM_MAX_TOKENS: int = 1000
    LLM_TEMPERATURE: float = 0.3
    TUTOR_DAILY_RATE_LIMIT: int = 100

    # RAG Pipeline Configuration
    RAG_MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB limit
    RAG_CHUNK_SIZE: int = 500
    RAG_CHUNK_OVERLAP: int = 100
    RAG_MIN_SIMILARITY: float = 0.15
    RAG_TOP_K: int = 3

    # Safe Coding Practice Configuration
    CODING_SANDBOX_ENABLED: bool = False  # Strict safety default: safe AST analysis active
    CODING_EXECUTION_TIMEOUT_SECONDS: float = 2.0


@lru_cache()
def get_settings() -> Settings:
    """Return a cached instance of application settings."""
    return Settings()
