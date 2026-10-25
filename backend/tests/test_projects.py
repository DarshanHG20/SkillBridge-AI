"""Tests for Project-Based Learning, Milestones, and Student Portfolios."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.project import Project


@pytest.fixture
def sample_project(db_session: Session) -> Project:
    """Fixture providing a test project template."""
    p = Project(
        title="URL Shortener Microservice",
        description="Build a high-performance URL shortener with Redis caching and analytics.",
        difficulty="intermediate",
        rubric_json={"performance": "Sub-50ms redirect response times", "security": "Rate-limited endpoints"},
        milestones_json=[
            {"step": 1, "title": "Setup routing and database"},
            {"step": 2, "title": "Implement collision-resistant hashing"},
            {"step": 3, "title": "Add analytics caching layer"},
        ],
    )
    db_session.add(p)
    db_session.commit()
    db_session.refresh(p)
    return p


def test_list_and_get_project(client: TestClient, sample_project: Project):
    """Verify projects can be listed and inspected."""
    res = client.get("/api/v1/projects")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    titles = [p["title"] for p in data]
    assert "URL Shortener Microservice" in titles

    detail_res = client.get(f"/api/v1/projects/{sample_project.id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["difficulty"] == "intermediate"


def test_student_project_progress_lifecycle(client: TestClient, sample_project: Project):
    """Verify student can start, update, and submit evidence for a project."""
    auth_res = client.post(
        "/api/v1/auth/register",
        json={"email": "builder@example.com", "full_name": "Builder User", "password": "Password123!"},
    )
    token = auth_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Advance progress to in_progress (50%)
    upd_res = client.post(
        f"/api/v1/projects/{sample_project.id}/progress",
        headers=headers,
        json={
            "status": "in_progress",
            "completion_percentage": 50.0,
            "evidence_notes": "Completed database schema and initial test suite.",
        },
    )
    assert upd_res.status_code == 200
    prog_data = upd_res.json()
    assert prog_data["status"] == "in_progress"
    assert prog_data["completion_percentage"] == 50.0

    # Submit final evidence (100%)
    sub_res = client.post(
        f"/api/v1/projects/{sample_project.id}/progress",
        headers=headers,
        json={
            "status": "submitted",
            "completion_percentage": 100.0,
            "evidence_notes": "GitHub repo: https://github.com/example/url-shortener. Deployed at https://short.example.com",
        },
    )
    assert sub_res.status_code == 200
    final_data = sub_res.json()
    assert final_data["status"] == "submitted"
    assert final_data["submitted_at"] is not None

    # Retrieve portfolio
    port_res = client.get("/api/v1/projects/my-portfolio", headers=headers)
    assert port_res.status_code == 200
    portfolio = port_res.json()
    assert len(portfolio) == 1
    assert portfolio[0]["project_title"] == "URL Shortener Microservice"
    assert portfolio[0]["status"] == "submitted"
