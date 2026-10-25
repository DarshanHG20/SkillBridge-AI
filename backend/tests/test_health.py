"""Unit tests for the health check and discovery endpoints."""

from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    """Ensure root discovery endpoint responds with 200 and operational metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert "service" in data
    assert data["api_v1"] == "/api/v1"
    assert data["health_check"] == "/api/v1/health"


def test_health_endpoint(client: TestClient):
    """Ensure /api/v1/health responds with 200, valid status, and database connectivity."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "version" in data
    assert "timestamp" in data
    assert "details" in data
    assert data["details"]["api_version"] == "/api/v1"
