"""Cryptographic security utilities: password hashing and JWT token management."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union

import bcrypt
import jwt

from app.core.config import get_settings

settings = get_settings()


def get_password_hash(password: str) -> str:
    """Generate a secure salted bcrypt hash for a plaintext password."""
    # Bcrypt has a 72-byte limit; truncate or encode properly
    password_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify that a plaintext password matches a stored bcrypt hash."""
    try:
        password_bytes = plain_password.encode("utf-8")[:72]
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


def create_access_token(
    subject: Union[str, int],
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Generate a signed JWT access token for user authentication."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "type": "access",
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
    }

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(
    subject: Union[str, int],
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Generate a signed JWT refresh token with longer expiration."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "type": "refresh",
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
    }

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a signed JWT token."""
    return jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[settings.ALGORITHM],
        options={"require": ["exp", "sub", "type"]},
    )
