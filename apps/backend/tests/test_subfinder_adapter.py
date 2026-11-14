# apps/backend/tests/test_subfinder_adapter.py
import pytest
import json
import subprocess
from unittest.mock import patch, MagicMock, AsyncMock
from app.integrations.scanners.subfinder import SubfinderScannerAdapter
from app.core.safety import SecurityBoundaryError


def test_subfinder_initialization():
    adapter = SubfinderScannerAdapter()
    assert adapter.scanner_name == "subfinder"
    assert adapter.timeout_seconds > 0


def test_subfinder_target_allowlist_permits_authorized():
    adapter = SubfinderScannerAdapter()
    # "mock-saas.local", "localhost", "127.0.0.1" are allowed by default
    assert adapter.validate_target("mock-saas.local") is True
    assert adapter.validate_target("localhost") is True


def test_subfinder_target_allowlist_rejects_unauthorized():
    adapter = SubfinderScannerAdapter()
    with pytest.raises(SecurityBoundaryError, match="authorized target allowlist"):
        adapter.validate_target("unauthorized-target.com")

    with pytest.raises(SecurityBoundaryError, match="authorized target allowlist"):
        adapter.validate_target("google.com")

    with pytest.raises(SecurityBoundaryError, match="cannot be empty"):
        adapter.validate_target("")


def test_subdomain_scope_confinement_filters_out_of_scope():
    adapter = SubfinderScannerAdapter()
    raw_entries = [
        {"host": "auth.mock-saas.local", "ip": "10.0.0.1"},
        {"host": "api.mock-saas.local", "ip": "10.0.0.2"},
        {"host": "malicious-takeover.external.com", "ip": "1.2.3.4"},
        {"host": "evil.org", "ip": "5.6.7.8"},
    ]
    confined = adapter.filter_scope_confinement(raw_entries, "mock-saas.local")
    assert len(confined) == 2
    assert confined[0]["host"] == "auth.mock-saas.local"
    assert confined[1]["host"] == "api.mock-saas.local"


@pytest.mark.asyncio
async def test_subfinder_offline_in_demo_mode_returns_synthetic():
    adapter = SubfinderScannerAdapter()
    with patch.object(adapter, "is_available", new_callable=AsyncMock) as mock_avail:
        mock_avail.return_value = False
        with patch("app.integrations.scanners.subfinder.settings.DEFAULT_OPERATING_MODE", "DEMO_MODE"):
            result = await adapter.execute_scan("mock-saas.local")
            assert result.scanner_name == "subfinder"
            assert result.exit_code == 0
            assert "DEMO_MODE" in result.raw_stderr
            assert len(result.parsed_items) >= 1
            assert any("mocksaas.com" in item.get("host", "") or "mock-saas.local" in item.get("host", "") for item in result.parsed_items)


@pytest.mark.asyncio
async def test_subfinder_offline_in_live_mode_returns_127():
    adapter = SubfinderScannerAdapter()
    with patch.object(adapter, "is_available", new_callable=AsyncMock) as mock_avail:
        mock_avail.return_value = False
        with patch("app.integrations.scanners.subfinder.settings.DEFAULT_OPERATING_MODE", "LIVE_ASSESSMENT_MODE"):
            result = await adapter.execute_scan("mock-saas.local")
            assert result.scanner_name == "subfinder"
            assert result.exit_code == 127
            assert "not found on PATH" in result.raw_stderr
            assert result.parsed_items == []


@pytest.mark.asyncio
async def test_subfinder_subprocess_execution_with_mock():
    adapter = SubfinderScannerAdapter()
    mock_jsonl = (
        '{"host": "api.mock-saas.local", "ip": "10.0.1.5", "source": "dns"}\n'
        '{"host": "admin.mock-saas.local", "ip": "10.0.1.6", "source": "crtsh"}\n'
    )
    mock_proc = MagicMock()
    mock_proc.returncode = 0
    mock_proc.stdout = mock_jsonl
    mock_proc.stderr = ""

    with patch.object(adapter, "is_available", new_callable=AsyncMock) as mock_avail:
        mock_avail.return_value = True
        with patch("subprocess.run", return_value=mock_proc) as mock_run:
            result = await adapter.execute_scan("mock-saas.local")
            assert result.exit_code == 0
            assert len(result.parsed_items) == 2
            assert result.parsed_items[0]["host"] == "api.mock-saas.local"
            assert result.parsed_items[1]["host"] == "admin.mock-saas.local"

            # Verify subprocess.run args
            mock_run.assert_called_once()
            call_kwargs = mock_run.call_args[1]
            assert call_kwargs.get("shell") is False
            cmd = mock_run.call_args[0][0]
            assert cmd[0] == "subfinder"
            assert "-d" in cmd
            assert "mock-saas.local" in cmd


@pytest.mark.asyncio
async def test_subfinder_timeout_handling():
    adapter = SubfinderScannerAdapter(timeout_seconds=5)
    with patch.object(adapter, "is_available", new_callable=AsyncMock) as mock_avail:
        mock_avail.return_value = True
        with patch("subprocess.run", side_effect=subprocess.TimeoutExpired(cmd=["subfinder"], timeout=5)):
            result = await adapter.execute_scan("mock-saas.local")
            assert result.exit_code == 124
            assert "timed out" in result.raw_stderr.lower()
