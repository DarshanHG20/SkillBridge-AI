"""User profile management and student account endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.models.user import StudentProfile, User
from app.schemas.user import (
    StudentProfileResponse,
    StudentProfileUpdate,
    UserResponse,
    UserUpdateRequest,
)

router = APIRouter()


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
    description="Returns identity, role, and student profile for the authenticated caller.",
)
def get_current_user_profile(
    current_user: User = Depends(get_current_active_user),
) -> UserResponse:
    """Retrieve the authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.put(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update current user account details",
    description="Allows updating account metadata such as full name.",
)
def update_current_user(
    data: UserUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Update caller's account details."""
    if data.full_name is not None:
        current_user.full_name = data.full_name.strip()

    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.put(
    "/me/profile",
    response_model=StudentProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Update student learning profile",
    description="Allows students to modify their bio, target career role, and weekly study target.",
)
def update_student_profile(
    data: StudentProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> StudentProfileResponse:
    """Update caller's student profile."""
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()

    if not profile:
        # Create profile if not yet existing
        profile = StudentProfile(user_id=current_user.id)
        db.add(profile)

    update_dict = data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return StudentProfileResponse.model_validate(profile)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user by ID (Authorized)",
    description="Allows users to view their own profile or administrators to view any learner profile.",
)
def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Protect cross-user data access."""
    # Enforce that students cannot access another student's account
    if current_user.id != user_id and current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: you cannot inspect or modify another learner's profile.",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserResponse.model_validate(user)
