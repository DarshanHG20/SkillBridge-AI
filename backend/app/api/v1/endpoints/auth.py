"""Authentication endpoints: registration, login, token refresh, and password recovery."""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from jwt import ExpiredSignatureError, PyJWTError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.user import StudentProfile, User
from app.schemas.user import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    TokenRefreshRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)

router = APIRouter()
settings = get_settings()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new student account",
    description="Registers a new user. Public registration strictly assigns the 'student' role.",
)
def register(
    data: UserRegisterRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Register student account, create default profile, and issue authentication tokens."""
    # Check if user already exists
    normalized_email = data.email.lower().strip()
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    # Hash password and persist user strictly as student
    hashed_pw = get_password_hash(data.password)
    user = User(
        email=normalized_email,
        hashed_password=hashed_pw,
        full_name=data.full_name.strip(),
        role="student",  # Enforce role safety
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    db.flush()  # Obtain user.id

    # Create associated student profile
    profile = StudentProfile(
        user_id=user.id,
        headline=f"Aspiring {data.full_name.strip()} Learner",
        bio="",
        target_role="Software Engineer",
        education_level="Self-taught / University",
        target_hours_per_week=10,
        preferred_learning_style="visual",
    )
    db.add(profile)
    db.commit()
    db.refresh(user)

    # Issue JWT tokens
    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id, role=user.role)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate and obtain JWT tokens",
    description="Validates email/password credentials and returns access and refresh tokens.",
)
def login(
    data: UserLoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Validate credentials and return JWT tokens with user profile."""
    normalized_email = data.email.lower().strip()
    user = db.query(User).filter(User.email == normalized_email).first()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated. Please contact support.",
        )

    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id, role=user.role)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh an expired access token",
    description="Exchanges a valid refresh token for a newly signed access and refresh token pair.",
)
def refresh_token(
    data: TokenRefreshRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Issue fresh tokens using a valid refresh token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(data.refresh_token)
        token_type = payload.get("type")
        if token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Expected refresh token, received access token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise credentials_exception
        user_id = int(user_id_str)
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (PyJWTError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated",
        )

    new_access_token = create_access_token(subject=user.id, role=user.role)
    new_refresh_token = create_refresh_token(subject=user.id, role=user.role)

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    status_code=status.HTTP_200_OK,
    summary="Request password recovery",
    description="Initiates password recovery. In local development, returns simulation instructions.",
)
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> ForgotPasswordResponse:
    """Handle password reset requests gracefully with email delivery transparency."""
    normalized_email = data.email.lower().strip()
    user = db.query(User).filter(User.email == normalized_email).first()

    # Always return a 200 to prevent email enumeration attacks
    if not user:
        return ForgotPasswordResponse(
            message="If an account with that email exists, password recovery instructions have been prepared.",
            delivery_status="simulated",
            note="Development mode: SMTP email server is not configured in this environment.",
        )

    return ForgotPasswordResponse(
        message="If an account with that email exists, password recovery instructions have been prepared.",
        delivery_status="simulated",
        note=(
            "Development mode: External email delivery requires an SMTP provider (e.g. SendGrid or Amazon SES). "
            "For testing in Part 2, administrators can reset credentials or update accounts via /api/v1/admin/users."
        ),
    )
