"""Comprehensive automated integration tests for Part 5 Admin & Analytics features."""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash
from app.models.user import User
from app.models.skill import Skill
from app.models.assessment import Assessment


def seed_admin_part5(db: Session, email: str = "part5admin@skillbridge.ai") -> tuple[User, str]:
    """Helper to seed an active administrator for Part 5 tests."""
    admin = User(
        email=email,
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Part 5 Administrator",
        role="admin",
        is_active=True,
        is_verified=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    token = create_access_token(subject=admin.id, role=admin.role)
    return admin, token


def test_admin_update_user_role_and_prevent_self_demotion(client: TestClient, db_session: Session):
    """Test role elevation, demotion, and self-demotion prevention."""
    admin, token = seed_admin_part5(db_session, "roleadmin@skillbridge.ai")
    headers = {"Authorization": f"Bearer {token}"}

    # Register student
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "student_to_promote@example.com", "full_name": "Promoted Student", "password": "Password123!"},
    )
    student_id = reg.json()["user"]["id"]

    # 1. Promote student to instructor
    res = client.patch(
        f"/api/v1/admin/users/{student_id}/role",
        headers=headers,
        json={"role": "instructor"},
    )
    assert res.status_code == 200
    assert res.json()["role"] == "instructor"

    # 2. Promote to admin
    res = client.patch(
        f"/api/v1/admin/users/{student_id}/role",
        headers=headers,
        json={"role": "admin"},
    )
    assert res.status_code == 200
    assert res.json()["role"] == "admin"

    # 3. Prevent self-demotion
    self_demote = client.patch(
        f"/api/v1/admin/users/{admin.id}/role",
        headers=headers,
        json={"role": "student"},
    )
    assert self_demote.status_code == 400
    assert "cannot revoke your own administrator role" in self_demote.json()["detail"]


def test_admin_skill_and_assessment_management(client: TestClient, db_session: Session):
    """Test admin skill creation, duplicate conflict, assessment, and question lifecycle."""
    admin, token = seed_admin_part5(db_session, "contentadmin@skillbridge.ai")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Skill
    skill_res = client.post(
        "/api/v1/admin/skills",
        headers=headers,
        json={
            "slug": "rust-lang",
            "title": "Rust Systems Programming",
            "category": "Systems",
            "description": "Memory safe systems programming.",
            "difficulty_level": "intermediate",
        },
    )
    assert skill_res.status_code == 201
    skill_id = skill_res.json()["skill_id"]

    # Duplicate conflict
    dup_res = client.post(
        "/api/v1/admin/skills",
        headers=headers,
        json={"slug": "rust-lang", "title": "Duplicate", "category": "Systems"},
    )
    assert dup_res.status_code == 409

    # 2. Create Assessment for this skill
    assess_res = client.post(
        "/api/v1/admin/assessments",
        headers=headers,
        json={
            "title": "Rust Ownership Benchmark",
            "description": "Test ownership, borrowing, and lifetimes.",
            "skill_id": skill_id,
            "assessment_type": "diagnostic",
            "pass_percentage": 75.0,
            "time_limit_minutes": 30,
        },
    )
    assert assess_res.status_code == 201
    assessment_id = assess_res.json()["assessment_id"]

    # 3. Add Question to Assessment
    q_res = client.post(
        f"/api/v1/admin/assessments/{assessment_id}/questions",
        headers=headers,
        json={
            "prompt": "What ensures memory safety in Rust without a garbage collector?",
            "question_type": "single_choice",
            "options_json": ["Borrow checker & Ownership", "Reference counting only", "Virtual machine", "Manual free()"],
            "correct_answer_json": 0,
            "explanation": "Rust uses affine type system and borrow checker at compile time.",
            "difficulty": "medium",
            "points": 15,
        },
    )
    assert q_res.status_code == 201
    question_id = q_res.json()["question_id"]

    # 4. Delete Question
    del_q = client.delete(f"/api/v1/admin/questions/{question_id}", headers=headers)
    assert del_q.status_code == 200

    # 5. Delete Assessment
    del_a = client.delete(f"/api/v1/admin/assessments/{assessment_id}", headers=headers)
    assert del_a.status_code == 200

    # 6. Delete Skill
    del_s = client.delete(f"/api/v1/admin/skills/{skill_id}", headers=headers)
    assert del_s.status_code == 200


def test_admin_career_and_project_management(client: TestClient, db_session: Session):
    """Test admin career pathway and hands-on project template management."""
    admin, token = seed_admin_part5(db_session, "pathadmin@skillbridge.ai")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Career
    c_res = client.post(
        "/api/v1/admin/careers",
        headers=headers,
        json={
            "slug": "ai-safety-engineer",
            "title": "AI Safety Engineer",
            "description": "Evaluating and aligning advanced foundation models.",
            "average_salary_range": "$140,000 - $220,000",
            "industry": "Artificial Intelligence",
        },
    )
    assert c_res.status_code == 201
    career_id = c_res.json()["career_id"]

    # 2. Create Project Template
    p_res = client.post(
        "/api/v1/admin/projects",
        headers=headers,
        json={
            "title": "Model Red Teaming Suite",
            "description": "Build an automated prompt injection harness.",
            "difficulty": "advanced",
            "rubric_json": {"safety_coverage": 40, "code_quality": 30, "benchmarks": 30},
            "milestones_json": [{"step": 1, "task": "Design adversarial attack vectors"}],
            "career_id": career_id,
        },
    )
    assert p_res.status_code == 201
    project_id = p_res.json()["project_id"]

    # 3. Clean up
    del_p = client.delete(f"/api/v1/admin/projects/{project_id}", headers=headers)
    assert del_p.status_code == 200

    del_c = client.delete(f"/api/v1/admin/careers/{career_id}", headers=headers)
    assert del_c.status_code == 200


def test_student_feedback_lifecycle(client: TestClient, db_session: Session):
    """Test student feedback submission and admin resolution review."""
    admin, admin_token = seed_admin_part5(db_session, "feedbackadmin@skillbridge.ai")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Student registers and submits feedback
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "feedbacker@example.com", "full_name": "Feedbacker", "password": "Password123!"},
    )
    student_token = reg.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    submit_res = client.post(
        "/api/v1/feedback",
        headers=student_headers,
        json={
            "category": "bug_report",
            "title": "Question diagram doesn't scale on tablet",
            "message": "When rotating the screen, the graph diagram clips on right edge.",
        },
    )
    assert submit_res.status_code == 201
    feedback_id = submit_res.json()["id"]
    assert submit_res.json()["status"] == "pending"

    # Student views own feedback
    my_fb = client.get("/api/v1/feedback/my-feedback", headers=student_headers)
    assert my_fb.status_code == 200
    assert len(my_fb.json()) >= 1
    assert my_fb.json()[0]["id"] == feedback_id

    # Admin lists feedback
    admin_fb_list = client.get("/api/v1/admin/feedback?category=bug_report", headers=admin_headers)
    assert admin_fb_list.status_code == 200
    assert admin_fb_list.json()["total"] >= 1

    # Admin updates feedback status with resolution note
    update_fb = client.patch(
        f"/api/v1/admin/feedback/{feedback_id}/status",
        headers=admin_headers,
        json={"status": "resolved", "admin_notes": "Added responsive constraint in tablet layout."},
    )
    assert update_fb.status_code == 200
    assert update_fb.json()["status"] == "resolved"
    assert update_fb.json()["admin_notes"] == "Added responsive constraint in tablet layout."


def test_admin_analytics_and_audit_logs(client: TestClient, db_session: Session):
    """Test verified analytics calculation and audit log query."""
    admin, admin_token = seed_admin_part5(db_session, "auditadmin@skillbridge.ai")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Query analytics
    analytics_res = client.get("/api/v1/admin/analytics", headers=admin_headers)
    assert analytics_res.status_code == 200
    analytics = analytics_res.json()

    assert "user_metrics" in analytics
    assert "assessment_metrics" in analytics
    assert "skill_metrics" in analytics
    assert "ai_metrics" in analytics
    # Assert insufficient data flag is present and transparent
    assert "is_insufficient_data" in analytics["assessment_metrics"]
    assert isinstance(analytics["user_metrics"]["total_users"], int)

    # Query audit logs
    audit_res = client.get("/api/v1/admin/audit-logs", headers=admin_headers)
    assert audit_res.status_code == 200
    audit_data = audit_res.json()
    assert "items" in audit_data
    assert "total" in audit_data


def test_admin_csv_report_exports(client: TestClient, db_session: Session):
    """Test CSV report exports for users, assessments, and audit logs."""
    admin, token = seed_admin_part5(db_session, "csvexportadmin@skillbridge.ai")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Export Users CSV
    users_csv = client.get("/api/v1/admin/export/users.csv", headers=headers)
    assert users_csv.status_code == 200
    assert "text/csv" in users_csv.headers["content-type"]
    assert "Email,Full Name,Role" in users_csv.text

    # 2. Export Assessment Attempts CSV
    assessments_csv = client.get("/api/v1/admin/export/assessment-attempts.csv", headers=headers)
    assert assessments_csv.status_code == 200
    assert "text/csv" in assessments_csv.headers["content-type"]
    assert "Attempt ID,User ID,Assessment ID,Assessment Title" in assessments_csv.text

    # 3. Export Audit Logs CSV
    audit_csv = client.get("/api/v1/admin/export/audit-logs.csv", headers=headers)
    assert audit_csv.status_code == 200
    assert "text/csv" in audit_csv.headers["content-type"]
    assert "Log ID,Admin ID,Action" in audit_csv.text




def test_unauthorized_user_blocked_from_all_admin_endpoints(client: TestClient):
    """Ensure non-admin student is blocked (HTTP 403) from all sensitive admin actions."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "attacker@example.com", "full_name": "Attacker", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {token}"}

    # Verify blocks across diverse admin endpoints
    assert client.get("/api/v1/admin/analytics", headers=student_headers).status_code == 403
    assert client.get("/api/v1/admin/audit-logs", headers=student_headers).status_code == 403
    assert client.get("/api/v1/admin/export/users.csv", headers=student_headers).status_code == 403
    assert client.post("/api/v1/admin/skills", headers=student_headers, json={"slug": "bad", "title": "bad", "category": "bad"}).status_code == 403
    assert client.patch("/api/v1/admin/users/1/role", headers=student_headers, json={"role": "admin"}).status_code == 403
