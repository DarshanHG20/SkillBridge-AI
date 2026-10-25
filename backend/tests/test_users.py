"""Unit and integration tests for user profiles and cross-user authorization protection."""

from fastapi.testclient import TestClient


def test_get_current_user_profile_unauthorized(client: TestClient):
    """Ensure accessing /me without an Authorization header returns HTTP 401."""
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401


def test_get_current_user_profile_success(client: TestClient):
    """Ensure authenticated caller receives their own account and profile."""
    # Register
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "alice@example.com", "full_name": "Alice Learner", "password": "Password123!"},
    )
    token = res.json()["access_token"]

    # Call /me
    profile_res = client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert profile_res.status_code == 200
    data = profile_res.json()
    assert data["email"] == "alice@example.com"
    assert data["full_name"] == "Alice Learner"


def test_update_current_user_and_profile(client: TestClient):
    """Ensure student can update their name and learning profile parameters."""
    res = client.post(
        "/api/v1/auth/register",
        json={"email": "bob@example.com", "full_name": "Bob Original", "password": "Password123!"},
    )
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Update account name
    name_res = client.put(
        "/api/v1/users/me",
        headers=headers,
        json={"full_name": "Bob Updated"},
    )
    assert name_res.status_code == 200
    assert name_res.json()["full_name"] == "Bob Updated"

    # Update student profile
    prof_res = client.put(
        "/api/v1/users/me/profile",
        headers=headers,
        json={
            "headline": "Full-Stack Python Engineer",
            "bio": "Passionate learner studying FastAPI and Flutter.",
            "target_role": "Backend Engineer",
            "target_hours_per_week": 15,
            "preferred_learning_style": "interactive",
        },
    )
    assert prof_res.status_code == 200
    data = prof_res.json()
    assert data["headline"] == "Full-Stack Python Engineer"
    assert data["target_hours_per_week"] == 15


def test_cross_user_access_protection(client: TestClient):
    """Ensure a student CANNOT inspect or read another student's account details."""
    # Student A
    res_a = client.post(
        "/api/v1/auth/register",
        json={"email": "student_a@example.com", "full_name": "Student A", "password": "Password123!"},
    )
    token_a = res_a.json()["access_token"]
    id_a = res_a.json()["user"]["id"]

    # Student B
    res_b = client.post(
        "/api/v1/auth/register",
        json={"email": "student_b@example.com", "full_name": "Student B", "password": "Password123!"},
    )
    id_b = res_b.json()["user"]["id"]

    # Student A tries to query Student B's endpoint
    response = client.get(
        f"/api/v1/users/{id_b}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    # Must be 403 Forbidden
    assert response.status_code == 403
    assert "forbidden" in response.json()["detail"].lower()

    # Student A CAN query their own endpoint
    own_res = client.get(
        f"/api/v1/users/{id_a}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert own_res.status_code == 200
    assert own_res.json()["email"] == "student_a@example.com"
