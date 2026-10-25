"""Unit and integration tests for authentication and session management."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.user import User


def test_register_student_success(client: TestClient):
    """Ensure public registration succeeds and strictly enforces the student role."""
    payload = {
        "email": "newstudent@example.com",
        "full_name": "New Student",
        "password": "SecurePassword123!",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "newstudent@example.com"
    assert data["user"]["role"] == "student"  # Strict role check
    assert data["user"]["is_active"] is True
    assert data["user"]["profile"] is not None


def test_register_duplicate_email(client: TestClient):
    """Ensure registering with an existing email returns HTTP 409 Conflict."""
    payload = {
        "email": "duplicate@example.com",
        "full_name": "Original User",
        "password": "SecurePassword123!",
    }
    # First registration
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    # Second registration with same email
    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


def test_register_invalid_inputs(client: TestClient):
    """Ensure invalid emails and short passwords fail schema validation with HTTP 422."""
    # Bad email
    res1 = client.post(
        "/api/v1/auth/register",
        json={"email": "not-an-email", "full_name": "Test", "password": "Password123!"},
    )
    assert res1.status_code == 422

    # Short password (< 8 chars)
    res2 = client.post(
        "/api/v1/auth/register",
        json={"email": "valid@example.com", "full_name": "Test", "password": "short"},
    )
    assert res2.status_code == 422


def test_login_success(client: TestClient, db_session: Session):
    """Ensure valid credentials return signed JWT tokens."""
    # Seed user
    user = User(
        email="login_user@example.com",
        hashed_password=get_password_hash("CorrectPassword123!"),
        full_name="Login Learner",
        role="student",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "login_user@example.com", "password": "CorrectPassword123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "login_user@example.com"


def test_login_invalid_password(client: TestClient, db_session: Session):
    """Ensure incorrect password returns HTTP 401."""
    user = User(
        email="wrong_pass@example.com",
        hashed_password=get_password_hash("RealPassword123!"),
        full_name="Test User",
        role="student",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "wrong_pass@example.com", "password": "IncorrectPassword!"},
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_login_nonexistent_user(client: TestClient):
    """Ensure unknown email returns HTTP 401 without leaking user non-existence."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "ghost@example.com", "password": "AnyPassword123!"},
    )
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["detail"]


def test_login_deactivated_account(client: TestClient, db_session: Session):
    """Ensure deactivated accounts are blocked with HTTP 403."""
    user = User(
        email="banned@example.com",
        hashed_password=get_password_hash("Password123!"),
        full_name="Banned User",
        role="student",
        is_active=False,
    )
    db_session.add(user)
    db_session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "banned@example.com", "password": "Password123!"},
    )
    assert response.status_code == 403
    assert "deactivated" in response.json()["detail"]


def test_token_refresh_flow(client: TestClient, db_session: Session):
    """Ensure refresh tokens can be used to acquire new access and refresh tokens."""
    # Register user
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "refresher@example.com",
            "full_name": "Refresher",
            "password": "Password123!",
        },
    )
    assert reg.status_code == 201
    refresh_tok = reg.json()["refresh_token"]

    # Exchange refresh token
    ref_res = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_tok},
    )
    assert ref_res.status_code == 200
    new_data = ref_res.json()
    assert "access_token" in new_data
    assert "refresh_token" in new_data
    assert new_data["user"]["email"] == "refresher@example.com"


def test_forgot_password_endpoint(client: TestClient):
    """Ensure forgot password responds gracefully with delivery notes."""
    response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "someone@example.com"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "instructions have been prepared" in data["message"]
    assert "note" in data
