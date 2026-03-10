"""Pydantic request/response schemas for the auth module."""

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default="learner", pattern="^(learner|instructor|admin)$")


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    is_approved: bool
    avatar_url: str | None = None

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    message: str


class TokenPayload(BaseModel):
    """Parsed claims from a validated JWT."""

    sub: str
    role: str
    type: str
