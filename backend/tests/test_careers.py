"""Tests for Career Intelligence, Gap Analysis, Roadmaps, and Disclaimers."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.skill import Skill, SkillMastery
from app.models.career import Career, CareerRequirement
from app.schemas.career import CAREER_DISCLAIMER


@pytest.fixture
def sample_career(db_session: Session) -> Career:
    """Fixture providing a test career pathway with two weighted skill requirements."""
    s1 = Skill(slug="fastapi-core", title="FastAPI Core", category="Web Development", difficulty_level="intermediate")
    s2 = Skill(slug="db-design", title="Database Design", category="SQL", difficulty_level="intermediate")
    db_session.add_all([s1, s2])
    db_session.flush()

    career = Career(
        slug="junior-backend-dev",
        title="Junior Backend Developer",
        description="Entry-level backend web engineering pathway",
        average_salary_range="$80k - $105k",
        industry="Technology",
    )
    db_session.add(career)
    db_session.flush()

    req1 = CareerRequirement(career_id=career.id, skill_id=s1.id, minimum_mastery_level=0.80, weight=1.0)
    req2 = CareerRequirement(career_id=career.id, skill_id=s2.id, minimum_mastery_level=0.80, weight=1.0)
    db_session.add_all([req1, req2])
    db_session.commit()
    return career


def test_list_careers(client: TestClient, sample_career: Career):
    """Verify career pathways can be retrieved."""
    res = client.get("/api/v1/careers")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    slugs = [c["slug"] for c in data]
    assert "junior-backend-dev" in slugs


def test_career_gap_analysis(client: TestClient, sample_career: Career, db_session: Session):
    """Verify weighted career readiness calculation and gap breakdown."""
    auth_res = client.post(
        "/api/v1/auth/register",
        json={"email": "career_user@example.com", "full_name": "Career User", "password": "Password123!"},
    )
    user_id = auth_res.json()["user"]["id"]
    token = auth_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # User mastered skill 1 (0.80 achieved out of 0.80 required -> 100%)
    # User has 0.0 for skill 2 (0.0 achieved out of 0.80 required -> 0%)
    # Overall readiness = (0.80 + 0.0) / (0.80 + 0.80) = 0.80 / 1.60 = 50.0%
    s1 = db_session.query(Skill).filter(Skill.slug == "fastapi-core").first()
    m1 = SkillMastery(user_id=user_id, skill_id=s1.id, mastery_score=0.80, status="mastered")
    db_session.add(m1)
    db_session.commit()

    gap_res = client.get(f"/api/v1/careers/{sample_career.slug}/gap-analysis", headers=headers)
    assert gap_res.status_code == 200
    gap_data = gap_res.json()
    assert gap_data["overall_readiness_percentage"] == 50.0
    assert gap_data["skills_analyzed_count"] == 2
    assert gap_data["skills_met_count"] == 1
    assert len(gap_data["strengths"]) == 1
    assert gap_data["strengths"][0]["skill_slug"] == "fastapi-core"
    assert len(gap_data["top_skill_gaps"]) == 1
    assert gap_data["top_skill_gaps"][0]["skill_slug"] == "db-design"

    # Mandatory Legal Disclaimer Check
    assert "SkillBridge AI does not guarantee" in gap_data["disclaimer"]


def test_generate_30_60_90_day_roadmaps(client: TestClient, sample_career: Career):
    """Verify generating tailored roadmaps produces sequential milestones."""
    auth_res = client.post(
        "/api/v1/auth/register",
        json={"email": "roadmap_user@example.com", "full_name": "Roadmap User", "password": "Password123!"},
    )
    token = auth_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Generate 30-day roadmap
    res_30 = client.post(
        f"/api/v1/careers/{sample_career.slug}/generate-roadmap",
        headers=headers,
        json={"plan_type": "30_day"},
    )
    assert res_30.status_code == 200
    data_30 = res_30.json()
    assert data_30["plan_type"] == "30_day"
    assert len(data_30["milestones"]) == 3
    assert "Days 1-10" in data_30["milestones"][0]["period"]
    assert CAREER_DISCLAIMER == data_30["disclaimer"]

    # Generate 90-day roadmap
    res_90 = client.post(
        f"/api/v1/careers/{sample_career.slug}/generate-roadmap",
        headers=headers,
        json={"plan_type": "90_day"},
    )
    assert res_90.status_code == 200
    data_90 = res_90.json()
    assert data_90["plan_type"] == "90_day"
    assert len(data_90["milestones"]) == 3
    assert "Month 1 (Days 1-30)" in data_90["milestones"][0]["period"]
