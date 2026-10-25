"""Tests for Assessment sessions, server-side grading, ownership checks, and history."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.skill import Skill
from app.models.assessment import Assessment, Question


@pytest.fixture
def sample_assessment(db_session: Session) -> Assessment:
    """Fixture providing a test assessment with two graded multiple choice questions."""
    skill = Skill(slug="test-python", title="Test Python", category="Python", difficulty_level="beginner")
    db_session.add(skill)
    db_session.flush()

    assessment = Assessment(
        title="Python Diagnostic Quiz",
        description="Test basic python comprehension",
        skill_id=skill.id,
        assessment_type="diagnostic",
        pass_percentage=75.0,
        time_limit_minutes=10,
    )
    db_session.add(assessment)
    db_session.flush()

    q1 = Question(
        assessment_id=assessment.id,
        prompt="What is the keyword to define a function in Python?",
        question_type="single_choice",
        options_json=["def", "func", "function", "lambda"],
        correct_answer_json="def",
        explanation="The 'def' keyword is reserved in Python to introduce a function definition.",
        difficulty="easy",
        points=10,
    )
    q2 = Question(
        assessment_id=assessment.id,
        prompt="Which collection is immutable in Python?",
        question_type="single_choice",
        options_json=["list", "set", "dict", "tuple"],
        correct_answer_json="tuple",
        explanation="Tuples cannot be altered once created in Python.",
        difficulty="easy",
        points=10,
    )
    db_session.add_all([q1, q2])
    db_session.commit()
    db_session.refresh(assessment)
    return assessment


def test_start_assessment_strips_answers(client: TestClient, sample_assessment: Assessment):
    """Verify that starting an assessment returns questions without exposing answer keys."""
    auth_res = client.post(
        "/api/v1/auth/register",
        json={"email": "quiz_user@example.com", "full_name": "Quiz User", "password": "Password123!"},
    )
    token = auth_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(f"/api/v1/assessments/{sample_assessment.id}/start", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "attempt_id" in data
    assert len(data["questions"]) == 2

    # CRITICAL: Verify answers and explanations are NOT leaked before submission
    for q in data["questions"]:
        assert "correct_answer_json" not in q
        assert "explanation" not in q
        assert "options_json" in q
        assert "prompt" in q


def test_server_side_scoring_and_passing(client: TestClient, sample_assessment: Assessment):
    """Verify server-side scoring produces accurate points, percentage, and pass/fail state."""
    auth_res = client.post(
        "/api/v1/auth/register",
        json={"email": "pass_user@example.com", "full_name": "Pass User", "password": "Password123!"},
    )
    token = auth_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Start attempt
    start_res = client.post(f"/api/v1/assessments/{sample_assessment.id}/start", headers=headers)
    attempt_id = start_res.json()["attempt_id"]
    questions = start_res.json()["questions"]

    # Submit 100% correct answers
    q1_id = questions[0]["id"]
    q2_id = questions[1]["id"]
    submit_payload = {
        "responses": [
            {"question_id": q1_id, "learner_response_json": "def", "time_spent_seconds": 12},
            {"question_id": q2_id, "learner_response_json": "tuple", "time_spent_seconds": 15},
        ]
    }

    sub_res = client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit",
        headers=headers,
        json=submit_payload,
    )
    assert sub_res.status_code == 200
    result = sub_res.json()
    assert result["score_achieved"] == 100.0
    assert result["is_passed"] is True
    assert result["total_points_earned"] == 20
    assert result["total_points_possible"] == 20
    assert len(result["question_results"]) == 2
    # Verify explanations ARE provided in the graded response
    assert result["question_results"][0]["explanation"] is not None
    assert result["question_results"][0]["is_correct"] is True


def test_prevent_duplicate_submission(client: TestClient, sample_assessment: Assessment):
    """Verify that an attempt cannot be submitted multiple times."""
    auth_res = client.post(
        "/api/v1/auth/register",
        json={"email": "dup_user@example.com", "full_name": "Dup User", "password": "Password123!"},
    )
    token = auth_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    start_res = client.post(f"/api/v1/assessments/{sample_assessment.id}/start", headers=headers)
    attempt_id = start_res.json()["attempt_id"]

    submit_payload = {"responses": []}

    # First submission
    sub1 = client.post(f"/api/v1/assessments/attempts/{attempt_id}/submit", headers=headers, json=submit_payload)
    assert sub1.status_code == 200

    # Second submission must fail with 400
    sub2 = client.post(f"/api/v1/assessments/attempts/{attempt_id}/submit", headers=headers, json=submit_payload)
    assert sub2.status_code == 400
    assert "already been submitted" in sub2.json()["detail"].lower()


def test_attempt_ownership_protection(client: TestClient, sample_assessment: Assessment):
    """Verify student B cannot submit answers for student A's attempt session."""
    # Register User A and start attempt
    res_a = client.post(
        "/api/v1/auth/register",
        json={"email": "user_a@example.com", "full_name": "User A", "password": "Password123!"},
    )
    token_a = res_a.json()["access_token"]
    start_a = client.post(
        f"/api/v1/assessments/{sample_assessment.id}/start",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    attempt_id = start_a.json()["attempt_id"]

    # Register User B
    res_b = client.post(
        "/api/v1/auth/register",
        json={"email": "user_b@example.com", "full_name": "User B", "password": "Password123!"},
    )
    token_b = res_b.json()["access_token"]

    # User B tries to submit attempt belonging to User A
    hack_res = client.post(
        f"/api/v1/assessments/attempts/{attempt_id}/submit",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"responses": []},
    )
    assert hack_res.status_code == 403
    assert "permission" in hack_res.json()["detail"].lower()

    # User B tries to view User A's attempt results
    view_res = client.get(
        f"/api/v1/assessments/attempts/{attempt_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert view_res.status_code == 403


def test_assessment_history(client: TestClient, sample_assessment: Assessment):
    """Verify student can retrieve their historical test attempts."""
    auth_res = client.post(
        "/api/v1/auth/register",
        json={"email": "history_user@example.com", "full_name": "Hist User", "password": "Password123!"},
    )
    token = auth_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Start and submit one attempt
    start = client.post(f"/api/v1/assessments/{sample_assessment.id}/start", headers=headers)
    att_id = start.json()["attempt_id"]
    client.post(f"/api/v1/assessments/attempts/{att_id}/submit", headers=headers, json={"responses": []})

    # Retrieve history
    hist_res = client.get("/api/v1/assessments/my-history", headers=headers)
    assert hist_res.status_code == 200
    records = hist_res.json()
    assert len(records) == 1
    assert records[0]["id"] == att_id
    assert records[0]["assessment_title"] == "Python Diagnostic Quiz"
