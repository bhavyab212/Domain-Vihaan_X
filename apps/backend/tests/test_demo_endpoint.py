# apps/backend/tests/test_demo_endpoint.py
"""
Integration tests for POST /api/v1/demo/reset endpoint:
HTTP status codes, response schema, duration benchmarks, and idempotency.
"""

import time
import pytest


def test_post_demo_reset_success(client):
    """Verify POST /api/v1/demo/reset executes successfully and matches DemoResetResponse schema."""
    start = time.perf_counter()
    response = client.post("/api/v1/demo/reset")
    elapsed = time.perf_counter() - start

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "RESET_SUCCESSFUL"
    assert data["scenarioId"] == "demo-scenario-saas-breach"
    assert data["mode"] == "DEMO_MODE"
    assert data["assetsCount"] >= 3
    assert data["findingsCount"] >= 2
    assert data["relationshipsCount"] >= 2
    assert data["attackPathsCount"] >= 1
    assert data["walVerified"] is True
    assert "runtimeWorkspace" in data
    assert "mock_saas" in data["runtimeWorkspace"]

    # Verify performance: sub-second execution requirement (< 1000ms)
    assert elapsed < 1.0
    assert data["durationMs"] < 1000.0


def test_post_demo_reset_idempotency(client):
    """Verify multiple consecutive calls return consistent state and identical counts."""
    res1 = client.post("/api/v1/demo/reset")
    res2 = client.post("/api/v1/demo/reset")

    assert res1.status_code == 200
    assert res2.status_code == 200

    d1, d2 = res1.json(), res2.json()
    assert d1["assetsCount"] == d2["assetsCount"]
    assert d1["findingsCount"] == d2["findingsCount"]
    assert d1["relationshipsCount"] == d2["relationshipsCount"]
    assert d1["attackPathsCount"] == d2["attackPathsCount"]


def test_demo_reset_disallowed_in_live_mode(app, client, monkeypatch):
    """Verify reset is rejected when platform is configured for LIVE_ASSESSMENT_MODE."""
    from app.core import config
    monkeypatch.setattr(config.settings, "DEFAULT_OPERATING_MODE", "LIVE_ASSESSMENT_MODE")

    response = client.post("/api/v1/demo/reset")
    assert response.status_code == 400
    data = response.json()
    assert "only permitted when running in DEMO_MODE" in data.get("message", "")
