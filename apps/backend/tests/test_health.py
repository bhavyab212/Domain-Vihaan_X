# apps/backend/tests/test_health.py
"""
Test suite for Backend Foundation, Health endpoint, CORS, and Exception Handling.
Validates requirements in TSK-003 and contracts/openapi/openapi.yaml.
"""

import pytest
from pydantic import ValidationError
from app.core.config import Settings, settings
from app.core.exceptions import ResourceNotFoundError, SecurityBoundaryViolationError


def test_app_imports_successfully():
    """Verify core application modules import without error."""
    from app.main import app, create_application
    from app.core.config import settings
    from app.core.logging import setup_logging
    assert app is not None
    assert callable(create_application)


def test_health_v1_endpoint_returns_200(client):
    """Verify GET /api/v1/health returns HTTP 200 and matches OpenAPI schema."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    
    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"
    assert "mode" in data
    assert data["mode"] == "DEMO_MODE"
    assert "scanners" in data
    assert isinstance(data["scanners"], dict)


def test_health_honest_scanner_telemetry(client):
    """
    Verify scanners are represented honestly.
    Unimplemented or unchecked scanners must be marked unchecked/unconfigured, not falsely claimed as healthy.
    """
    response = client.get("/api/v1/health")
    data = response.json()
    scanners = data.get("scanners", {})
    # Scanners must indicate honest state: ready (if binary present), unverified, optional-unconfigured, or configured
    for scanner, state in scanners.items():
        assert state in ["ready", "unverified", "optional-unconfigured", "configured"]


def test_openapi_json_available(client):
    """Verify OpenAPI specification is reachable and contains /api/v1/health."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    assert spec["info"]["title"] == "Domain-Vihaan_X API"
    assert "/api/v1/health" in spec["paths"]


def test_root_metadata_endpoint(client):
    """Verify root endpoint provides discoverability for docs and health."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["health"] == "/api/v1/health"
    assert data["docs"] == "/docs"


def test_cors_preflight_allows_frontend_origin(client):
    """Verify CORS headers allow Developer B's frontend origin http://localhost:5173."""
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET"
        }
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_disallows_unauthorized_origin(client):
    """Verify CORS preflight does not reflect untrusted origins."""
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://malicious-external-site.evil",
            "Access-Control-Request-Method": "GET"
        }
    )
    # When origin is not in allowlist, Access-Control-Allow-Origin header is not set to the evil origin
    assert response.headers.get("access-control-allow-origin") != "http://malicious-external-site.evil"


def test_centralized_http_exception_handler(client):
    """Verify 404 HTTP exceptions return structured JSON."""
    response = client.get("/api/v1/non-existent-endpoint-xyz")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert data["error"] == "HTTPException"
    assert "Not Found" in data["message"]


def test_domain_exception_handler(app, client):
    """Verify custom domain exceptions return structured JSON matching schema."""
    @app.get("/api/v1/test-domain-error")
    async def trigger_domain_error():
        raise ResourceNotFoundError("Mock asset not found for test")

    response = client.get("/api/v1/test-domain-error")
    assert response.status_code == 404
    data = response.json()
    assert data["error"] == "ResourceNotFoundError"
    assert "Mock asset not found for test" in data["message"]


def test_safe_configuration_defaults():
    """Verify that configuration defaults are safe and contain no real production secrets."""
    assert settings.DEFAULT_OPERATING_MODE == "DEMO_MODE"
    assert "127.0.0.1" in settings.APP_HOST or "localhost" in settings.APP_HOST
    assert settings.GEMINI_API_KEY == "" or "placeholder" in settings.GEMINI_API_KEY.lower()
    assert settings.HEXSTRIKE_MCP_URL == "" or "localhost" in settings.HEXSTRIKE_MCP_URL


def test_invalid_operating_mode_fails_validation():
    """Verify that invalid operating modes fail configuration validation immediately."""
    with pytest.raises(ValidationError):
        Settings(DEFAULT_OPERATING_MODE="UNSAFE_INVALID_MODE")
