"""Pydantic request and response schemas for Authentication and User management."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ==============================================================================
# Student Profile Schemas
# ==============================================================================

class StudentProfileBase(BaseModel):
    headline: Optional[str] = Field(None, max_length=200, description="Short professional headline")
    bio: Optional[str] = Field(None, max_length=2000, description="Detailed student bio")
    target_role: Optional[str] = Field(None, max_length=150, description="Target job title or career goal")
    education_level: Optional[str] = Field(None, max_length=100, description="Current education level")
    target_hours_per_week: int = Field(10, ge=1, le=100, description="Weekly hours dedicated to study")
    preferred_learning_style: str = Field("visual", max_length=50, description="Learning style preference")


class StudentProfileUpdate(BaseModel):
    headline: Optional[str] = Field(None, max_length=200)
    bio: Optional[str] = Field(None, max_length=2000)
    target_role: Optional[str] = Field(None, max_length=150)
    education_level: Optional[str] = Field(None, max_length=100)
    target_hours_per_week: Optional[int] = Field(None, ge=1, le=100)
    preferred_learning_style: Optional[str] = Field(None, max_length=50)


class StudentProfileResponse(StudentProfileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# User Account Schemas
# ==============================================================================

class UserBase(BaseModel):
    email: EmailStr = Field(..., description="Unique email address")
    full_name: str = Field(..., min_length=2, max_length=150, description="User full name")


class UserRegisterRequest(BaseModel):
    email: EmailStr = Field(..., description="Unique email address")
    full_name: str = Field(..., min_length=2, max_length=150, description="User full name")
    password: str = Field(..., min_length=8, max_length=100, description="Password (minimum 8 characters)")

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v.strip()) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        return v


class UserLoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User plaintext password")


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)


class UserStatusUpdate(BaseModel):
    is_active: bool = Field(..., description="Set active (True) or deactivated (False)")


class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    profile: Optional[StudentProfileResponse] = None

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    items: List[UserResponse]
    total: int
    skip: int
    limit: int


# ==============================================================================
# Token & Session Schemas
# ==============================================================================

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class TokenRefreshRequest(BaseModel):
    refresh_token: str = Field(..., description="Valid JWT refresh token")


# ==============================================================================
# Password Recovery Schemas
# ==============================================================================

class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered account email")


class ForgotPasswordResponse(BaseModel):
    message: str
    delivery_status: str
    note: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    recovery_code: str = Field(..., min_length=6, description="Reset verification code")
    new_password: str = Field(..., min_length=8, description="New password (minimum 8 characters)")
