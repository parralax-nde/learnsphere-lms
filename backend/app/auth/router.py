"""Authentication router: signup, login, token refresh, logout, and /me."""

from datetime import datetime, timezone

import bcrypt
import jwt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_auth
from app.auth.jwt import (
    TOKEN_TYPE_REFRESH,
    clear_auth_cookies,
    create_access_token,
    create_refresh_token,
    decode_token,
    set_auth_cookies,
)
from app.auth.schemas import LoginRequest, MessageResponse, SignupRequest, UserResponse
from app.database import get_db
from app.models.user import RefreshToken, User, UserRole

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _issue_tokens(user: User, response: Response, db: Session) -> tuple[str, str]:
    """Create a new access/refresh token pair, persist the refresh token, and
    set both as HTTP-only cookies on *response*.

    Returns the ``(access_token, refresh_token)`` strings.
    """
    access_token = create_access_token(subject=user.id, role=user.role.value)
    refresh_token, jti, expires_at = create_refresh_token(subject=user.id)

    db_refresh = RefreshToken(user_id=user.id, jti=jti, expires_at=expires_at)
    db.add(db_refresh)
    db.commit()

    set_auth_cookies(response, access_token, refresh_token)
    return access_token, refresh_token


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, response: Response, db: Session = Depends(get_db)):
    """Register a new user account and issue tokens immediately.

    - Learners and admins are auto-approved.
    - Instructors start with ``is_approved=False`` and must await admin approval.
    """
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    role = UserRole(body.role)
    is_approved = role != UserRole.instructor

    user = User(
        full_name=body.full_name,
        email=body.email,
        password_hash=_hash_password(body.password),
        role=role,
        is_approved=is_approved,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    _issue_tokens(user, response, db)
    return user


@router.post("/login", response_model=UserResponse)
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """Authenticate with email + password and issue a new token pair.

    On success both an *access token* (short-lived) and a *refresh token*
    (long-lived) are set as HTTP-only cookies.
    """
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not _verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )

    _issue_tokens(user, response, db)
    return user


@router.post("/refresh", response_model=MessageResponse)
def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
):
    """Exchange a valid refresh token for a new access/refresh token pair.

    The previous refresh token's *jti* is revoked in the database
    (refresh-token rotation) so that each refresh token can only be used once.
    This limits the window of abuse if a refresh token is ever stolen.
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not refresh_token:
        raise credentials_exc

    try:
        payload = decode_token(refresh_token)
    except jwt.InvalidTokenError:
        raise credentials_exc

    if payload.get("type") != TOKEN_TYPE_REFRESH:
        raise credentials_exc

    jti: str | None = payload.get("jti")
    user_id: str | None = payload.get("sub")
    if not jti or not user_id:
        raise credentials_exc

    db_token = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
    if db_token is None or db_token.revoked:
        raise credentials_exc
    if db_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise credentials_exc

    user = db.get(User, int(user_id))
    if user is None or not user.is_active:
        raise credentials_exc

    # Revoke the old refresh token (rotation).
    db_token.revoked = True
    db.commit()

    _issue_tokens(user, response, db)
    return {"message": "Token refreshed successfully"}


@router.post("/logout", response_model=MessageResponse)
def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_auth),
):
    """Revoke the current session by invalidating the refresh token and
    clearing both auth cookies from the client.
    """
    if refresh_token:
        try:
            payload = decode_token(refresh_token)
            jti = payload.get("jti")
            if jti:
                db_token = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
                if db_token and not db_token.revoked:
                    db_token.revoked = True
                    db.commit()
        except jwt.InvalidTokenError:
            pass  # Token is already invalid; proceed with cookie cleanup.

    clear_auth_cookies(response)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
def get_current_user(current_user: User = Depends(require_auth)):
    """Return the authenticated user's profile.

    This endpoint validates the access token on every request, satisfying the
    requirement that tokens are verified on each protected API call.
    """
    return current_user
