# apps/backend/tests/test_hexstrike_bridge.py
import pytest
import httpx
from unittest.mock import patch, MagicMock, AsyncMock
from app.integrations.scanners.hexstrike import (
    HexStrikeAdapter,
    SCAN_PROFILE_PASSIVE_RECON,
    SCAN_PROFILE_WEB_AUDIT,
    SCAN_PROFILE_LOCAL_PORT_CHECK,
    ALLOWED_SCAN_PROFILES
)
from app.core.safety import SecurityBoundaryError


@pytest.mark.asyncio
async def test_loopback_enforcement_accepts_valid_loopback_urls():
    """Verify that localhost and 127.0.0.1 with any valid port are accepted as endpoint."""
    adapter1 = HexStrikeAdapter(endpoint_url="http://127.0.0.1:8888")
    assert adapter1.endpoint_url == "http://127.0.0.1:8888"

    adapter2 = HexStrikeAdapter(endpoint_url="http://localhost:9000")
    assert adapter2.endpoint_url == "http://localhost:9000"


@pytest.mark.asyncio
async def test_loopback_enforcement_rejects_external_endpoints():
    """Verify that non-loopback endpoints are strictly rejected with SecurityBoundaryError."""
    with pytest.raises(SecurityBoundaryError, match="Loopback Violation"):
        HexStrikeAdapter(endpoint_url="http://192.168.1.50:8888")

    with pytest.raises(SecurityBoundaryError, match="Loopback Violation"):
        HexStrikeAdapter(endpoint_url="http://evil-server.attacker.com:8000")

    with pytest.raises(SecurityBoundaryError, match="Loopback Violation"):
        HexStrikeAdapter(endpoint_url="http://10.0.0.5:8888")


@pytest.mark.asyncio
async def test_target_validation_permits_authorized_targets():
    """Verify authorized targets (localhost, 127.0.0.1, mock-saas.local) pass validation."""
    adapter = HexStrikeAdapter(endpoint_url="http://127.0.0.1:8888")
    assert adapter.validate_target("localhost") is True
    assert adapter.validate_target("127.0.0.1") is True
    assert adapter.validate_target("mock-saas.local") is True
    assert adapter.validate_target("http://127.0.0.1:8000") is True
    assert adapter.validate_target("http://localhost:3000/api") is True


@pytest.mark.asyncio
async def test_target_validation_rejects_unauthorized_targets():
    """Verify arbitrary or external targets raise SecurityBoundaryError."""
    adapter = HexStrikeAdapter(endpoint_url="http://127.0.0.1:8888")
    with pytest.raises(SecurityBoundaryError):
        adapter.validate_target("google.com")

    with pytest.raises(SecurityBoundaryError):
        adapter.validate_target("http://target-company.com")

    with pytest.raises(SecurityBoundaryError):
        adapter.validate_target("192.168.1.1")


@pytest.mark.asyncio
async def test_scan_profile_validation():
    """Verify only frozen scan profiles are permitted, rejecting arbitrary command flags."""
    adapter = HexStrikeAdapter(endpoint_url="http://127.0.0.1:8888")
    assert adapter.validate_profile(SCAN_PROFILE_PASSIVE_RECON) is True
    assert adapter.validate_profile(SCAN_PROFILE_WEB_AUDIT) is True
    assert adapter.validate_profile(SCAN_PROFILE_LOCAL_PORT_CHECK) is True

    with pytest.raises(SecurityBoundaryError, match="Invalid or unapproved scan profile"):
        adapter.validate_profile("CUSTOM_FULL_EXPLOIT_SCAN")

    with pytest.raises(SecurityBoundaryError, match="Invalid or unapproved scan profile"):
        adapter.validate_profile("--raw-flag -sV")


@pytest.mark.asyncio
async def test_hexstrike_offline_in_demo_mode_returns_synthetic_fallback():
    """Verify that when HexStrike is unreachable in DEMO_MODE, it returns synthetic DAST findings with exit_code=0."""
    adapter = HexStrikeAdapter(endpoint_url="http://127.0.0.1:8888")
    with patch.object(adapter, "is_available", new_callable=AsyncMock) as mock_avail:
        mock_avail.return_value = False
        with patch("app.integrations.scanners.hexstrike.settings.DEFAULT_OPERATING_MODE", "DEMO_MODE"):
            result = await adapter.execute_scan("mock-saas.local", profile=SCAN_PROFILE_WEB_AUDIT)
            assert result.scanner_name == "hexstrike"
            assert result.exit_code == 0
            assert "HexStrike service unavailable" in result.raw_stderr
            assert "DEMO_MODE" in result.raw_stderr or len(result.parsed_items) > 0
            assert len(result.parsed_items) >= 1
            assert any(item.get("source") == "hexstrike" for item in result.parsed_items)


@pytest.mark.asyncio
async def test_hexstrike_offline_in_live_mode_returns_exit_code_1():
    """Verify that when HexStrike is unreachable in LIVE_ASSESSMENT_MODE, it returns exit_code=1."""
    adapter = HexStrikeAdapter(endpoint_url="http://127.0.0.1:8888")
    with patch.object(adapter, "is_available", new_callable=AsyncMock) as mock_avail:
        mock_avail.return_value = False
        with patch("app.integrations.scanners.hexstrike.settings.DEFAULT_OPERATING_MODE", "LIVE_ASSESSMENT_MODE"):
            result = await adapter.execute_scan("mock-saas.local", profile=SCAN_PROFILE_WEB_AUDIT)
            assert result.scanner_name == "hexstrike"
            assert result.exit_code == 1
            assert "HexStrike service unavailable" in result.raw_stderr
            assert result.parsed_items == []


@pytest.mark.asyncio
async def test_hexstrike_timeout_handled_gracefully():
    """Verify that connection or read timeouts are handled without crashing."""
    adapter = HexStrikeAdapter(endpoint_url="http://127.0.0.1:8888")
    with patch.object(adapter, "is_available", new_callable=AsyncMock) as mock_avail:
        mock_avail.return_value = True
        with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Read timed out")):
            result = await adapter.execute_scan("127.0.0.1", profile=SCAN_PROFILE_LOCAL_PORT_CHECK)
            assert result.scanner_name == "hexstrike"
            assert result.exit_code == 124  # Standard timeout exit code
            assert "timed out" in result.raw_stderr.lower()


@pytest.mark.asyncio
async def test_secret_redaction_in_output():
    """Verify any bearer tokens or sensitive secrets returned in response or logs are redacted."""
    adapter = HexStrikeAdapter(endpoint_url="http://127.0.0.1:8888", auth_token="super_secret_token_123")
    with patch.object(adapter, "is_available", new_callable=AsyncMock) as mock_avail:
        mock_avail.return_value = True
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "status": "success",
            "findings": [
                {
                    "title": "Exposed Header with token Bearer super_secret_token_123",
                    "severity": "MEDIUM",
                    "details": "Authorization header leaked token=super_secret_token_123"
                }
            ]
        }
        mock_resp.text = '{"status": "success", "token": "super_secret_token_123"}'
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_resp
            result = await adapter.execute_scan("127.0.0.1", profile=SCAN_PROFILE_WEB_AUDIT)
            assert "super_secret_token_123" not in result.raw_stdout
            assert "[REDACTED]" in result.raw_stdout
