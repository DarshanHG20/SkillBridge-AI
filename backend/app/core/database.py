"""Database connection, engine configuration, and session management."""

from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from app.core.config import get_settings

settings = get_settings()

# Engine creation with dialect-specific options
engine_kwargs = {
    "echo": settings.DB_ECHO,
}

if settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # MySQL / MariaDB / PostgreSQL production pooling
    engine_kwargs.update(
        {
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_pre_ping": True,
            "pool_recycle": 3600,
        }
    )

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Shared Base for ORM models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency generator that yields an isolated database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> bool:
    """Verify live connectivity to the configured database."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            return True
    except Exception:
        return False
