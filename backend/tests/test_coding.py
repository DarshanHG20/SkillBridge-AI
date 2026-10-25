"""Tests for Safe Coding Practice, AST Security Scanner, Evaluation, and Recommendations."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.coding import CodingProblem, CodingSubmission
from app.coding.evaluator import CodingEvaluator, ASTSecurityScanner
from app.coding.service import CodingService


@pytest.fixture
def sample_problem(db_session: Session) -> CodingProblem:
    """Provide a seeded coding problem for tests."""
    problem = CodingProblem(
        slug="test-palindrome",
        title="Test Palindrome Problem",
        difficulty="easy",
        skill_slug="python-basics",
        description="Write a function `is_palindrome(s)` returning True if s is a palindrome.",
        starter_code="def is_palindrome(s):\n    pass\n",
        test_cases_json=[
            {"input": "racecar", "expected_output": True, "is_hidden": False},
            {"input": "hello", "expected_output": False, "is_hidden": False},
            {"input": "kayak", "expected_output": True, "is_hidden": True},
        ],
        hints_json=["Hint 1: Check if reversed string equals original."],
        rubric_json={"function_name": "is_palindrome"},
    )
    db_session.add(problem)
    db_session.commit()
    db_session.refresh(problem)
    return problem


def test_ast_security_scanner_blocks_dangerous_operations():
    """Verify AST security scanner prohibits malicious imports and built-in calls."""
    dangerous_snippets = [
        "import os\nos.system('rm -rf /')",
        "import sys\nsys.exit(1)",
        "import subprocess\nsubprocess.run(['ls'])",
        "import socket\ns = socket.socket()",
        "eval('__import__(\"os\").system(\"echo hacked\")')",
        "with open('/etc/passwd') as f: data = f.read()",
        "exec('print(123)')",
    ]

    for snippet in dangerous_snippets:
        is_safe, error_msg, _ = CodingEvaluator.validate_syntax_and_security(snippet)
        assert is_safe is False
        assert "Security Policy Violation" in (error_msg or "")


def test_ast_security_allows_pure_python_algorithms():
    """Verify safe algorithmic code passes security verification."""
    safe_code = (
        "def is_palindrome(s):\n"
        "    clean = [c.lower() for c in s if c.isalnum()]\n"
        "    return clean == clean[::-1]\n"
    )
    is_safe, error_msg, tree = CodingEvaluator.validate_syntax_and_security(safe_code)
    assert is_safe is True
    assert error_msg is None
    assert tree is not None


def test_coding_submission_lifecycle(client: TestClient, sample_problem: CodingProblem):
    """Verify submitting code, test evaluation, and public test case masking."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "coder@example.com", "full_name": "Test Coder", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Inspect problem: verify hidden test cases are masked
    prob_res = client.get(f"/api/v1/coding/problems/{sample_problem.slug}", headers=headers)
    assert prob_res.status_code == 200
    prob_data = prob_res.json()
    assert len(prob_data["public_test_cases"]) == 2  # Only 2 non-hidden cases

    # 2. Submit passing solution
    passing_code = (
        "def is_palindrome(s):\n"
        "    return s == s[::-1]\n"
    )
    sub_res = client.post(
        f"/api/v1/coding/problems/{sample_problem.id}/submit",
        headers=headers,
        json={"submitted_code": passing_code},
    )
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["status"] == "passed"
    assert sub_data["tests_passed"] == 3
    assert sub_data["total_tests"] == 3
    assert sub_data["execution_mode"] == "safe_static_analysis"


def test_coding_submission_security_violation_rejection(client: TestClient, sample_problem: CodingProblem):
    """Verify exploit payloads submitted via API are flagged with security_violation and rejected safely."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "attacker_coder@example.com", "full_name": "Attacker Coder", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    exploit_code = (
        "import os\n"
        "def is_palindrome(s):\n"
        "    os.system('id')\n"
        "    return True\n"
    )
    sub_res = client.post(
        f"/api/v1/coding/problems/{sample_problem.id}/submit",
        headers=headers,
        json={"submitted_code": exploit_code},
    )
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["status"] == "security_violation"
    assert sub_data["tests_passed"] == 0
    assert "Security Policy Violation" in sub_data["static_analysis_feedback_json"]["error_message"]


def test_submission_cross_user_ownership(client: TestClient, sample_problem: CodingProblem):
    """Verify Student B cannot inspect Student A's coding submission."""
    # Student A submits code
    res_a = client.post(
        "/api/v1/auth/register",
        json={"email": "student_alpha@example.com", "full_name": "Student Alpha", "password": "Password123!"},
    )
    headers_a = {"Authorization": f"Bearer {res_a.json()['access_token']}"}

    sub_a = client.post(
        f"/api/v1/coding/problems/{sample_problem.id}/submit",
        headers=headers_a,
        json={"submitted_code": "def is_palindrome(s):\n    return False\n"},
    ).json()
    sub_id = sub_a["id"]

    # Student B attempts to access Student A's submission
    res_b = client.post(
        "/api/v1/auth/register",
        json={"email": "student_beta@example.com", "full_name": "Student Beta", "password": "Password123!"},
    )
    headers_b = {"Authorization": f"Bearer {res_b.json()['access_token']}"}

    detail_res = client.get(f"/api/v1/coding/submissions/{sub_id}", headers=headers_b)
    assert detail_res.status_code == 403
    assert "forbidden" in detail_res.json()["detail"].lower()


def test_mistake_based_recommendations(client: TestClient, sample_problem: CodingProblem):
    """Verify repeated errors generate pedagogical remedial recommendations."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "struggling_coder@example.com", "full_name": "Struggling Coder", "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    # Submit code with syntax error
    client.post(
        f"/api/v1/coding/problems/{sample_problem.id}/submit",
        headers=headers,
        json={"submitted_code": "def broken_syntax(:\n    pass"},
    )

    # Request recommendations
    rec_res = client.get("/api/v1/coding/recommendations", headers=headers)
    assert rec_res.status_code == 200
    recs = rec_res.json()
    assert len(recs) > 0
    assert any("syntax" in r["title"].lower() or "syntax" in r["reason"].lower() for r in recs)
