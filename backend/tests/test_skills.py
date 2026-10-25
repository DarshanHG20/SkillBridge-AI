"""Tests for Skill Taxonomy, DAG Prerequisite Validation, and Status Resolution."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.skill import Skill, SkillPrerequisite, SkillMastery
from app.services.skill_service import SkillService


def test_seed_and_list_skills(client: TestClient, db_session: Session):
    """Verify that skills across categories can be listed and filtered."""
    # Insert two test skills
    s1 = Skill(slug="py-intro", title="Intro to Python", category="Python", difficulty_level="beginner")
    s2 = Skill(slug="java-intro", title="Intro to Java", category="Java", difficulty_level="beginner")
    db_session.add_all([s1, s2])
    db_session.commit()

    # Query all
    res = client.get("/api/v1/skills")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 2
    slugs = [s["slug"] for s in data]
    assert "py-intro" in slugs
    assert "java-intro" in slugs

    # Query filtered by category
    py_res = client.get("/api/v1/skills?category=Python")
    assert py_res.status_code == 200
    py_data = py_res.json()
    assert all(s["category"] == "Python" for s in py_data)


def test_get_skill_by_slug(client: TestClient, db_session: Session):
    """Verify fetching single skill by slug or returning 404."""
    s = Skill(slug="sql-intro", title="Intro to SQL", category="SQL", difficulty_level="beginner")
    db_session.add(s)
    db_session.commit()

    res = client.get("/api/v1/skills/sql-intro")
    assert res.status_code == 200
    assert res.json()["title"] == "Intro to SQL"

    missing_res = client.get("/api/v1/skills/non-existent-skill")
    assert missing_res.status_code == 404


def test_prerequisite_dag_validation(db_session: Session):
    """Ensure cycle detection correctly validates DAG acyclicity."""
    s1 = Skill(slug="s1", title="Skill 1", category="Test", difficulty_level="beginner")
    s2 = Skill(slug="s2", title="Skill 2", category="Test", difficulty_level="intermediate")
    s3 = Skill(slug="s3", title="Skill 3", category="Test", difficulty_level="advanced")
    db_session.add_all([s1, s2, s3])
    db_session.flush()

    # s1 -> s2 -> s3 (valid DAG)
    p1 = SkillPrerequisite(skill_id=s2.id, prerequisite_skill_id=s1.id, requirement_type="mandatory")
    p2 = SkillPrerequisite(skill_id=s3.id, prerequisite_skill_id=s2.id, requirement_type="mandatory")
    db_session.add_all([p1, p2])
    db_session.commit()

    assert SkillService.validate_dag(db_session) is True

    # Introduce cycle: s3 -> s1
    cycle_edge = SkillPrerequisite(skill_id=s1.id, prerequisite_skill_id=s3.id, requirement_type="mandatory")
    db_session.add(cycle_edge)
    db_session.commit()

    # Must detect cycle
    assert SkillService.validate_dag(db_session) is False


def test_prerequisite_lock_status(client: TestClient, db_session: Session):
    """Verify that a skill is locked until its mandatory prerequisite is mastered."""
    # Register user
    auth_res = client.post(
        "/api/v1/auth/register",
        json={"email": "dag_user@example.com", "full_name": "DAG User", "password": "Password123!"},
    )
    user_id = auth_res.json()["user"]["id"]
    token = auth_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    s_base = Skill(slug="base-math", title="Base Math", category="Math", difficulty_level="beginner")
    s_adv = Skill(slug="adv-math", title="Advanced Math", category="Math", difficulty_level="advanced")
    db_session.add_all([s_base, s_adv])
    db_session.flush()

    prereq = SkillPrerequisite(skill_id=s_adv.id, prerequisite_skill_id=s_base.id, requirement_type="mandatory")
    db_session.add(prereq)
    db_session.commit()

    # Initial check: base math has 0 mastery -> adv math must be locked
    is_met, unmet = SkillService.check_prerequisites_met(db_session, user_id, s_adv.id)
    assert is_met is False
    assert len(unmet) == 1

    # Query taxonomy tree via endpoint
    tree_res = client.get("/api/v1/skills/taxonomy/tree", headers=headers)
    assert tree_res.status_code == 200
    tree_data = {item["slug"]: item for item in tree_res.json()}
    assert tree_data["adv-math"]["status"] == "locked"

    # Now grant mastery to base math (0.75 >= 0.60 threshold)
    mastery = SkillMastery(user_id=user_id, skill_id=s_base.id, mastery_score=0.75, status="in_progress")
    db_session.add(mastery)
    db_session.commit()

    # Now adv math should be unlocked
    is_met_after, unmet_after = SkillService.check_prerequisites_met(db_session, user_id, s_adv.id)
    assert is_met_after is True
    assert len(unmet_after) == 0

    tree_res_after = client.get("/api/v1/skills/taxonomy/tree", headers=headers)
    tree_data_after = {item["slug"]: item for item in tree_res_after.json()}
    assert tree_data_after["adv-math"]["status"] == "unlocked"
