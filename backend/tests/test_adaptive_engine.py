"""Tests for the Adaptive Learning Engine (Mastery Tracking, Weakness Diagnosis, and Recommendations)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.skill import Skill, SkillMastery, SkillPrerequisite
from app.models.assessment import Assessment
from app.models.user import User
from app.services.adaptive_engine import AdaptiveEngine, MASTERY_REVISION_THRESHOLD, MASTERY_ADVANCE_THRESHOLD


def test_mastery_exponential_moving_average_update(db_session: Session):
    """Verify weighted Bayesian update smoothly adjusts mastery upon new assessment score."""
    skill = Skill(slug="py-loops", title="Python Loops", category="Python", difficulty_level="beginner")
    db_session.add(skill)
    db_session.flush()

    assessment = Assessment(title="Loops Quiz", skill_id=skill.id, pass_percentage=75.0)
    db_session.add(assessment)
    db_session.flush()

    user = User(email="learner_test@example.com", hashed_password="hashed_pw", full_name="Learner Test", role="student")
    db_session.add(user)
    db_session.flush()
    user_id = user.id

    # First attempt: 40% score
    rec1 = AdaptiveEngine.update_mastery_from_assessment(db_session, user_id, assessment, score_achieved=40.0)
    assert rec1.mastery_score == 0.40
    assert rec1.confidence_score == 0.60

    # Second attempt: 90% score -> update = (1 - 0.35) * 0.40 + 0.35 * 0.90 = 0.26 + 0.315 = 0.575
    rec2 = AdaptiveEngine.update_mastery_from_assessment(db_session, user_id, assessment, score_achieved=90.0)
    assert rec2.mastery_score == 0.575
    assert rec2.confidence_score > 0.60  # Confidence grew with repeat practice


def test_weak_concept_diagnosis(client: TestClient, db_session: Session):
    """Verify concept below 60% mastery is accurately diagnosed as weak."""
    auth_res = client.post(
        "/api/v1/auth/register",
        json={"email": "adaptive_user@example.com", "full_name": "Adaptive User", "password": "Password123!"},
    )
    user_id = auth_res.json()["user"]["id"]
    token = auth_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    s_weak = Skill(slug="weak-recursion", title="Recursion", category="DSA", difficulty_level="intermediate")
    s_strong = Skill(slug="strong-lists", title="Lists", category="DSA", difficulty_level="beginner")
    db_session.add_all([s_weak, s_strong])
    db_session.flush()

    m_weak = SkillMastery(user_id=user_id, skill_id=s_weak.id, mastery_score=0.45, status="in_progress")
    m_strong = SkillMastery(user_id=user_id, skill_id=s_strong.id, mastery_score=0.90, status="mastered")
    db_session.add_all([m_weak, m_strong])
    db_session.commit()

    # Query endpoint
    res = client.get("/api/v1/adaptive/weak-concepts", headers=headers)
    assert res.status_code == 200
    weak_list = res.json()
    assert len(weak_list) == 1
    assert weak_list[0]["skill_slug"] == "weak-recursion"
    assert weak_list[0]["mastery_score"] == 0.45
    assert "target >=" in weak_list[0]["reason"]


def test_adaptive_recommendation_prioritizes_revision(client: TestClient, db_session: Session):
    """Ensure weak concepts trigger a 'revision' recommendation with transparent explanation."""
    auth_res = client.post(
        "/api/v1/auth/register",
        json={"email": "reviser@example.com", "full_name": "Reviser User", "password": "Password123!"},
    )
    user_id = auth_res.json()["user"]["id"]
    token = auth_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    skill = Skill(slug="weak-sql", title="SQL Joins", category="SQL", difficulty_level="intermediate")
    db_session.add(skill)
    db_session.flush()

    # Mastery below 0.60
    mastery = SkillMastery(user_id=user_id, skill_id=skill.id, mastery_score=0.50, status="in_progress")
    db_session.add(mastery)
    db_session.commit()

    rec_res = client.get("/api/v1/adaptive/next-activity", headers=headers)
    assert rec_res.status_code == 200
    rec = rec_res.json()
    assert rec["recommendation_type"] == "revision"
    assert rec["target_skill_slug"] == "weak-sql"
    assert "Reinforce 'SQL Joins'" in rec["reason"]
    assert "below the proficiency threshold" in rec["reason"]


def test_adaptive_recommendation_intermediate_practice(client: TestClient, db_session: Session):
    """Ensure skills in 0.60 - 0.85 range trigger 'practice' recommendation."""
    auth_res = client.post(
        "/api/v1/auth/register",
        json={"email": "practicer@example.com", "full_name": "Practicer User", "password": "Password123!"},
    )
    user_id = auth_res.json()["user"]["id"]
    token = auth_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    skill = Skill(slug="inter-java", title="Java Collections", category="Java", difficulty_level="intermediate")
    db_session.add(skill)
    db_session.flush()

    mastery = SkillMastery(user_id=user_id, skill_id=skill.id, mastery_score=0.72, status="in_progress")
    db_session.add(mastery)
    db_session.commit()

    rec_res = client.get("/api/v1/adaptive/next-activity", headers=headers)
    assert rec_res.status_code == 200
    rec = rec_res.json()
    assert rec["recommendation_type"] == "practice"
    assert rec["target_skill_slug"] == "inter-java"
    assert "Level up 'Java Collections'" in rec["reason"]
