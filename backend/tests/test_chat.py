"""Tests for Learning Chatbot, pedagogical hints, conversation history, and cross-user privacy controls."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_conversation_lifecycle_and_messaging(client: TestClient):
    """Verify creating conversations, sending messages, and receiving tutor replies."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "chat_student@example.com", "full_name": "Chat Student", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create new conversation
    conv_res = client.post(
        "/api/v1/chat/conversations",
        headers=headers,
        json={"title": "DSA Study Session", "topic": "algorithms"},
    )
    assert conv_res.status_code == 200
    conv_id = conv_res.json()["id"]
    assert conv_res.json()["title"] == "DSA Study Session"

    # 2. Send message asking for a hint on two sum
    msg_res = client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        headers=headers,
        json={"content": "Can you give me a hint for the two sum problem without giving away the full answer?"},
    )
    assert msg_res.status_code == 200
    assistant_msg = msg_res.json()
    assert assistant_msg["sender"] == "assistant"
    assert len(assistant_msg["message_text"]) > 0

    # 3. Retrieve conversation history
    detail_res = client.get(f"/api/v1/chat/conversations/{conv_id}", headers=headers)
    assert detail_res.status_code == 200
    messages = detail_res.json()["messages"]
    assert len(messages) >= 2
    assert messages[0]["sender"] == "user"
    assert messages[1]["sender"] == "assistant"


def test_cross_user_privacy_isolation(client: TestClient):
    """Verify strict privacy controls: User A cannot access or append messages to User B's conversation."""
    # Student A creates conversation
    res_a = client.post(
        "/api/v1/auth/register",
        json={"email": "student_a@example.com", "full_name": "Student A", "password": "Password123!"},
    )
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    conv_a = client.post(
        "/api/v1/chat/conversations",
        headers=headers_a,
        json={"title": "Private Career Counseling", "topic": "career"},
    ).json()
    conv_id_a = conv_a["id"]

    # Student B logs in
    res_b = client.post(
        "/api/v1/auth/register",
        json={"email": "student_b@example.com", "full_name": "Student B", "password": "Password123!"},
    )
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Student B attempts to read Student A's conversation
    get_res = client.get(f"/api/v1/chat/conversations/{conv_id_a}", headers=headers_b)
    assert get_res.status_code == 403
    assert "Access denied" in get_res.json()["detail"]

    # Student B attempts to post message to Student A's conversation
    post_res = client.post(
        f"/api/v1/chat/conversations/{conv_id_a}/messages",
        headers=headers_b,
        json={"content": "Malicious intrusion attempt"},
    )
    assert post_res.status_code == 403
    assert "Access denied" in post_res.json()["detail"]

    # Student B lists conversations: must not see Student A's conversation
    list_res = client.get("/api/v1/chat/conversations", headers=headers_b)
    assert list_res.status_code == 200
    b_conv_ids = [c["id"] for c in list_res.json()]
    assert conv_id_a not in b_conv_ids


def test_conversation_deletion(client: TestClient):
    """Verify conversation and message purge for student privacy compliance."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": "delete_conv@example.com", "full_name": "Delete User", "password": "Password123!"},
    )
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    conv = client.post(
        "/api/v1/chat/conversations",
        headers=headers,
        json={"title": "Temporary Session"},
    ).json()
    conv_id = conv["id"]

    del_res = client.delete(f"/api/v1/chat/conversations/{conv_id}", headers=headers)
    assert del_res.status_code == 200

    # Ensure conversation no longer exists
    get_res = client.get(f"/api/v1/chat/conversations/{conv_id}", headers=headers)
    assert get_res.status_code == 404
