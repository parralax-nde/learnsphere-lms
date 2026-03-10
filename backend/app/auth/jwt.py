"""JWT creation, decoding, and cookie helpers."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from app.config import get_settings

settings = get_settings()

# Cookie names used across the application
ACCESS_TOKEN_COOKIE = "access_token"
REFRESH_TOKEN_COOKIE = "refresh_token"

# Token *type* claim values
TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(subject: int, role: str, extra_claims: dict[str, Any] | None = None) -> str:
    """Return a signed JWT access token for the given user.

    Args:
        subject: The user's primary-key (``id``).
        role: The user's role string (e.g. ``"learner"``).
        extra_claims: Optional additional claims merged into the payload.

    Returns:
        A compact, URL-safe signed JWT string.
    """
    expire = _utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "type": TOKEN_TYPE_ACCESS,
        "iat": _utcnow(),
        "exp": expire,
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: int) -> tuple[str, str, datetime]:
    """Return a signed JWT refresh token together with its jti and expiry.

    The *jti* (JWT ID) is stored in the database so the token can be
    individually revoked without invalidating the signing secret.

    Returns:
        A tuple of ``(encoded_jwt, jti, expires_at)``.
    """
    jti = str(uuid.uuid4())
    expire = _utcnow() + timedelta(days=settings.refresh_token_expire_days)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "jti": jti,
        "type": TOKEN_TYPE_REFRESH,
        "iat": _utcnow(),
        "exp": expire,
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)
    return token, jti, expire


def decode_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT, returning its payload.

    Raises:
        jwt.InvalidTokenError: On any verification failure (expired,
            tampered signature, wrong algorithm, etc.).
    """
    return jwt.decode(
        token,
        settings.secret_key,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["sub", "exp", "iat", "type"]},
    )


def set_auth_cookies(response: Any, access_token: str, refresh_token: str) -> None:
    """Attach both tokens as HTTP-only cookies to *response*.

    The ``secure`` flag is driven by ``settings.cookie_secure`` so that
    local development works over plain HTTP while production enforces HTTPS.
    """
    access_max_age = settings.access_token_expire_minutes * 60
    refresh_max_age = settings.refresh_token_expire_days * 24 * 60 * 60

    _set_cookie(response, ACCESS_TOKEN_COOKIE, access_token, access_max_age)
    _set_cookie(response, REFRESH_TOKEN_COOKIE, refresh_token, refresh_max_age)


def clear_auth_cookies(response: Any) -> None:
    """Delete both auth cookies from the client."""
    response.delete_cookie(ACCESS_TOKEN_COOKIE, httponly=True, samesite=settings.cookie_samesite)
    response.delete_cookie(REFRESH_TOKEN_COOKIE, httponly=True, samesite=settings.cookie_samesite)


def _set_cookie(response: Any, name: str, value: str, max_age: int) -> None:
    response.set_cookie(
        key=name,
        value=value,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=max_age,
    )
