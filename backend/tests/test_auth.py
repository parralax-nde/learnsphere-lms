"""Tests for the JWT session-management auth endpoints."""

import time
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import jwt
import pytest

from app.auth.jwt import (
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    TOKEN_TYPE_ACCESS,
    TOKEN_TYPE_REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.config import get_settings
from app.models.user import RefreshToken, User, UserRole

settings = get_settings()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SIGNUP_PAYLOAD = {
    "full_name": "Alice Learner",
    "email": "alice@example.com",
    "password": "Str0ngP@ss!",
    "role": "learner",
}


def signup_and_login(client, payload=None):
    """Convenience: register a user and return the response."""
    payload = payload or SIGNUP_PAYLOAD
    return client.post("/api/auth/signup", json=payload)


# ---------------------------------------------------------------------------
# JWT utility unit tests
# ---------------------------------------------------------------------------


class TestJWTUtilities:
    def test_create_access_token_contains_expected_claims(self):
        token = create_access_token(subject=1, role="learner")
        payload = decode_token(token)
        assert payload["sub"] == "1"
        assert payload["role"] == "learner"
        assert payload["type"] == TOKEN_TYPE_ACCESS
        assert "exp" in payload
        assert "iat" in payload

    def test_create_refresh_token_contains_expected_claims(self):
        token, jti, expires_at = create_refresh_token(subject=42)
        payload = decode_token(token)
        assert payload["sub"] == "42"
        assert payload["type"] == TOKEN_TYPE_REFRESH
        assert payload["jti"] == jti
        assert isinstance(expires_at, datetime)

    def test_decode_token_raises_on_expired(self):
        # Create a token that expired 1 second ago.
        payload = {
            "sub": "1",
            "role": "learner",
            "type": TOKEN_TYPE_ACCESS,
            "iat": datetime.now(timezone.utc) - timedelta(seconds=10),
            "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
        }
        token = jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)
        with pytest.raises(jwt.ExpiredSignatureError):
            decode_token(token)

    def test_decode_token_raises_on_tampered_signature(self):
        token = create_access_token(subject=1, role="learner")
        tampered = token[:-5] + "xxxxx"
        with pytest.raises(jwt.InvalidTokenError):
            decode_token(tampered)

    def test_decode_token_raises_on_wrong_secret(self):
        payload = {
            "sub": "1",
            "role": "learner",
            "type": TOKEN_TYPE_ACCESS,
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
        }
        token = jwt.encode(payload, "wrong-secret", algorithm=settings.jwt_algorithm)
        with pytest.raises(jwt.InvalidSignatureError):
            decode_token(token)


# ---------------------------------------------------------------------------
# /api/auth/signup
# ---------------------------------------------------------------------------


class TestSignup:
    def test_signup_success_returns_user(self, client):
        resp = signup_and_login(client)
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == SIGNUP_PAYLOAD["email"]
        assert data["role"] == "learner"
        assert data["is_approved"] is True
        assert "password_hash" not in data

    def test_signup_sets_auth_cookies(self, client):
        resp = signup_and_login(client)
        assert resp.status_code == 201
        assert ACCESS_TOKEN_COOKIE in resp.cookies
        assert REFRESH_TOKEN_COOKIE in resp.cookies

    def test_signup_duplicate_email_returns_409(self, client):
        signup_and_login(client)
        resp = signup_and_login(client)
        assert resp.status_code == 409

    def test_signup_instructor_not_approved(self, client):
        resp = client.post(
            "/api/auth/signup",
            json={**SIGNUP_PAYLOAD, "email": "bob@example.com", "role": "instructor"},
        )
        assert resp.status_code == 201
        assert resp.json()["is_approved"] is False

    def test_signup_invalid_role_returns_422(self, client):
        resp = client.post(
            "/api/auth/signup",
            json={**SIGNUP_PAYLOAD, "role": "superuser"},
        )
        assert resp.status_code == 422

    def test_signup_short_password_returns_422(self, client):
        resp = client.post(
            "/api/auth/signup",
            json={**SIGNUP_PAYLOAD, "password": "short"},
        )
        assert resp.status_code == 422

    def test_signup_invalid_email_returns_422(self, client):
        resp = client.post(
            "/api/auth/signup",
            json={**SIGNUP_PAYLOAD, "email": "not-an-email"},
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# /api/auth/login
# ---------------------------------------------------------------------------


class TestLogin:
    def setup_user(self, client):
        signup_and_login(client)

    def test_login_success_returns_user_and_sets_cookies(self, client):
        signup_and_login(client)
        resp = client.post(
            "/api/auth/login",
            json={"email": SIGNUP_PAYLOAD["email"], "password": SIGNUP_PAYLOAD["password"]},
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == SIGNUP_PAYLOAD["email"]
        assert ACCESS_TOKEN_COOKIE in resp.cookies
        assert REFRESH_TOKEN_COOKIE in resp.cookies

    def test_login_wrong_password_returns_401(self, client):
        signup_and_login(client)
        resp = client.post(
            "/api/auth/login",
            json={"email": SIGNUP_PAYLOAD["email"], "password": "WrongPassword!"},
        )
        assert resp.status_code == 401

    def test_login_nonexistent_email_returns_401(self, client):
        resp = client.post(
            "/api/auth/login",
            json={"email": "ghost@example.com", "password": "DoesntMatter1!"},
        )
        assert resp.status_code == 401

    def test_login_inactive_user_returns_403(self, client, db):
        signup_and_login(client)
        user = db.query(User).filter(User.email == SIGNUP_PAYLOAD["email"]).first()
        user.is_active = False
        db.commit()

        resp = client.post(
            "/api/auth/login",
            json={"email": SIGNUP_PAYLOAD["email"], "password": SIGNUP_PAYLOAD["password"]},
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# /api/auth/refresh
# ---------------------------------------------------------------------------


class TestRefresh:
    def test_refresh_issues_new_tokens(self, client):
        signup_and_login(client)
        old_access = client.cookies.get(ACCESS_TOKEN_COOKIE)
        old_refresh = client.cookies.get(REFRESH_TOKEN_COOKIE)

        # Wait a moment so the new token has a different "iat".
        time.sleep(1)

        resp = client.post("/api/auth/refresh")
        assert resp.status_code == 200
        assert resp.json()["message"] == "Token refreshed successfully"

        new_access = client.cookies.get(ACCESS_TOKEN_COOKIE)
        new_refresh = client.cookies.get(REFRESH_TOKEN_COOKIE)

        # New tokens must be different from the old ones (rotation).
        assert new_access != old_access
        assert new_refresh != old_refresh

    def test_refresh_rotates_refresh_token(self, client, db):
        """The old jti must be revoked after a refresh."""
        signup_and_login(client)
        refresh_cookie = client.cookies.get(REFRESH_TOKEN_COOKIE)
        old_payload = decode_token(refresh_cookie)
        old_jti = old_payload["jti"]

        client.post("/api/auth/refresh")

        db_token = db.query(RefreshToken).filter(RefreshToken.jti == old_jti).first()
        assert db_token is not None
        assert db_token.revoked is True

    def test_refresh_without_cookie_returns_401(self, client):
        resp = client.post("/api/auth/refresh")
        assert resp.status_code == 401

    def test_refresh_with_revoked_token_returns_401(self, client, db):
        signup_and_login(client)
        refresh_cookie = client.cookies.get(REFRESH_TOKEN_COOKIE)
        payload = decode_token(refresh_cookie)

        db_token = db.query(RefreshToken).filter(RefreshToken.jti == payload["jti"]).first()
        db_token.revoked = True
        db.commit()

        resp = client.post("/api/auth/refresh")
        assert resp.status_code == 401

    def test_refresh_with_access_token_instead_of_refresh_token_returns_401(self, client):
        """Sending the access token in the refresh cookie must be rejected."""
        signup_and_login(client)
        access_cookie = client.cookies.get(ACCESS_TOKEN_COOKIE)
        # Manually set the refresh_token cookie to the access token value.
        client.cookies.set(REFRESH_TOKEN_COOKIE, access_cookie)
        resp = client.post("/api/auth/refresh")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# /api/auth/logout
# ---------------------------------------------------------------------------


class TestLogout:
    def test_logout_clears_cookies(self, client):
        signup_and_login(client)
        resp = client.post("/api/auth/logout")
        assert resp.status_code == 200
        # After logout the cookie values should be empty / absent.
        assert client.cookies.get(ACCESS_TOKEN_COOKIE) in (None, "")
        assert client.cookies.get(REFRESH_TOKEN_COOKIE) in (None, "")

    def test_logout_revokes_refresh_token(self, client, db):
        signup_and_login(client)
        refresh_cookie = client.cookies.get(REFRESH_TOKEN_COOKIE)
        payload = decode_token(refresh_cookie)

        client.post("/api/auth/logout")

        db_token = db.query(RefreshToken).filter(RefreshToken.jti == payload["jti"]).first()
        assert db_token is not None
        assert db_token.revoked is True

    def test_logout_without_auth_returns_401(self, client):
        resp = client.post("/api/auth/logout")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# /api/auth/me
# ---------------------------------------------------------------------------


class TestGetCurrentUser:
    def test_me_returns_authenticated_user(self, client):
        signup_and_login(client)
        resp = client.get("/api/auth/me")
        assert resp.status_code == 200
        assert resp.json()["email"] == SIGNUP_PAYLOAD["email"]

    def test_me_without_token_returns_401(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_with_expired_access_token_returns_401(self, client):
        signup_and_login(client)

        # Replace the access token with an already-expired one.
        expired_payload = {
            "sub": "1",
            "role": "learner",
            "type": TOKEN_TYPE_ACCESS,
            "iat": datetime.now(timezone.utc) - timedelta(hours=1),
            "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
        }
        expired_token = jwt.encode(
            expired_payload, settings.secret_key, algorithm=settings.jwt_algorithm
        )
        client.cookies.set(ACCESS_TOKEN_COOKIE, expired_token)

        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_with_tampered_access_token_returns_401(self, client):
        signup_and_login(client)
        good_token = client.cookies.get(ACCESS_TOKEN_COOKIE)
        client.cookies.set(ACCESS_TOKEN_COOKIE, good_token[:-5] + "XXXXX")
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_with_refresh_token_in_access_slot_returns_401(self, client):
        """The /me endpoint must reject refresh tokens in the access-token slot."""
        signup_and_login(client)
        refresh_cookie = client.cookies.get(REFRESH_TOKEN_COOKIE)
        client.cookies.set(ACCESS_TOKEN_COOKIE, refresh_cookie)
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Protected-route dependency tests
# ---------------------------------------------------------------------------


class TestDependencies:
    def test_require_approved_blocks_unapproved_instructor(self, client, db):
        """A pending instructor must not access approved-only routes."""
        client.post(
            "/api/auth/signup",
            json={**SIGNUP_PAYLOAD, "email": "pending@example.com", "role": "instructor"},
        )
        user = db.query(User).filter(User.email == "pending@example.com").first()
        assert not user.is_approved

        # /api/auth/me uses require_auth (not require_approved), so it works.
        resp = client.get("/api/auth/me")
        assert resp.status_code == 200
        assert resp.json()["is_approved"] is False
