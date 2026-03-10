"""FastAPI dependency functions for authentication and authorization."""

import jwt
from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.jwt import TOKEN_TYPE_ACCESS, decode_token
from app.database import get_db
from app.models.user import User, UserRole


def _get_current_user(
    access_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User:
    """Validate the access-token cookie and return the authenticated user.

    Raises ``HTTP 401`` if the token is missing, expired, tampered, or the
    user no longer exists in the database.
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not access_token:
        raise credentials_exc

    try:
        payload = decode_token(access_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise credentials_exc

    if payload.get("type") != TOKEN_TYPE_ACCESS:
        raise credentials_exc

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise credentials_exc

    user = db.get(User, int(user_id))
    if user is None or not user.is_active:
        raise credentials_exc

    return user


def require_auth(user: User = Depends(_get_current_user)) -> User:
    """Require any authenticated user."""
    return user


def require_approved(user: User = Depends(_get_current_user)) -> User:
    """Require an authenticated user whose account has been approved.

    Instructors start as *pending*; this guard prevents them from accessing
    protected resources until an admin approves them.
    """
    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending admin approval",
        )
    return user


def require_admin(user: User = Depends(require_approved)) -> User:
    """Require the ``admin`` role."""
    if user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


def require_instructor(user: User = Depends(require_approved)) -> User:
    """Require the ``instructor`` role (and admin approval)."""
    if user.role != UserRole.instructor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Instructor access required",
        )
    return user
