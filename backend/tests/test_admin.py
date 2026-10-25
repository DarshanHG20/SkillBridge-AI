"""Unit and integration tests for administration and RBAC enforcement."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash
from app.models.user import User


def seed_admin_user(db: Session, email: str = "superadmin@skillbridge.ai") -> tuple[User, str]:
    """Helper to seed an active administrator and return user and JWT access token."""
    admin = User(
        email=email,
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Platform Administrator",
        role="admin",
        is_active=True,
        is_verified=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    token = create_access_token(subject=admin.id, role=admin.role)
    return admin, token


def test_student_cannot_access_admin_endpoints(client: TestClient):
    """Ensure standard student accounts cannot access administrative routes."""
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "regular_student@example.com", "full_name": "Regular Student", "password": "Password123!"},
    )
    student_token = res.json()["access_token"]

    response = client.get(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert response.status_code == 403
    assert "Administrative privileges required" in response.json()["detail"]


def test_admin_list_users_with_search_and_pagination(client: TestClient, db_session: Session):
    """Ensure administrators can list users, search by keyword, and paginate results."""
    admin, token = seed_admin_user(db_session, "admin1@skillbridge.ai")
    headers = {"Authorization": f"Bearer {token}"}

    # Register a couple of students
    client.post(
        "/api/v1/auth/register",
        json={"email": "charlie@example.com", "full_name": "Charlie Chaplin", "password": "Password123!"},
    )
    client.post(
        "/api/v1/auth/register",
        json={"email": "dana@example.com", "full_name": "Dana Scully", "password": "Password123!"},
    )

    # 1. List all users
    list_res = client.get("/api/v1/admin/users", headers=headers)
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] >= 3
    assert len(data["items"]) >= 3

    # 2. Search for "Charlie"
    search_res = client.get("/api/v1/admin/users?search=Charlie", headers=headers)
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert search_data["total"] == 1
    assert search_data["items"][0]["email"] == "charlie@example.com"

    # 3. Filter by role "admin"
    admin_filter_res = client.get("/api/v1/admin/users?role=admin", headers=headers)
    assert admin_filter_res.status_code == 200
    admin_data = admin_filter_res.json()
    assert all(u["role"] == "admin" for u in admin_data["items"])


def test_admin_deactivate_and_activate_user(client: TestClient, db_session: Session):
    """Ensure administrators can toggle user active status and prevent deactivated logins."""
    admin, admin_token = seed_admin_user(db_session, "admin2@skillbridge.ai")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Register student
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "victim@example.com", "full_name": "Victim Student", "password": "Password123!"},
    )
    student_id = reg.json()["user"]["id"]

    # Deactivate student
    deact_res = client.patch(
        f"/api/v1/admin/users/{student_id}/status",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert deact_res.status_code == 200
    assert deact_res.json()["is_active"] is False

    # Attempt login as deactivated student -> 403 Forbidden
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "victim@example.com", "password": "Password123!"},
    )
    assert login_res.status_code == 403
    assert "deactivated" in login_res.json()["detail"].lower()

    # Reactivate student
    react_res = client.patch(
        f"/api/v1/admin/users/{student_id}/status",
        headers=admin_headers,
        json={"is_active": True},
    )
    assert react_res.status_code == 200
    assert react_res.json()["is_active"] is True

    # Student can now login successfully
    login_ok = client.post(
        "/api/v1/auth/login",
        json={"email": "victim@example.com", "password": "Password123!"},
    )
    assert login_ok.status_code == 200


def test_admin_cannot_deactivate_self(client: TestClient, db_session: Session):
    """Ensure an administrator is prevented from accidentally disabling their own account."""
    admin, admin_token = seed_admin_user(db_session, "admin_self@skillbridge.ai")
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.patch(
        f"/api/v1/admin/users/{admin.id}/status",
        headers=headers,
        json={"is_active": False},
    )
    assert res.status_code == 400
    assert "cannot deactivate your own" in res.json()["detail"]
