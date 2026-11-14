# apps/backend/tests/test_checkov_adapter.py
"""
Unit tests for Checkov IaC CLI Subprocess Adapter (TSK-012):
Validates safe subprocess execution (shell=False), target validation, exit code handling,
JSON output parsing, timeout handling, and offline DEMO_MODE fallback.
"""

import json
import subprocess
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from app.integrations.scanners.checkov import CheckovScannerAdapter
from app.core.safety import SecurityBoundaryError
from app.core.config import settings


@pytest.fixture
def adapter():
    return CheckovScannerAdapter()


@pytest.mark.asyncio
async def test_checkov_is_available(adapter, monkeypatch):
    """Verify is_available queries system PATH."""
    monkeypatch.setattr("shutil.which", lambda cmd: "/usr/local/bin/checkov" if cmd == "checkov" else None)
    assert await adapter.is_available() is True

    monkeypatch.setattr("shutil.which", lambda cmd: None)
    assert await adapter.is_available() is False


@pytest.mark.asyncio
async def test_checkov_unsafe_target_path_rejected(adapter):
    """Verify target path outside approved sandbox raises SecurityBoundaryError."""
    unsafe_paths = ["/etc/terraform", "C:\\Windows\\IaC", "../../../sensitive_infra"]
    for path in unsafe_paths:
        with pytest.raises(SecurityBoundaryError):
            await adapter.execute_scan(path)


@pytest.mark.asyncio
async def test_checkov_successful_scan_with_failed_checks(adapter, tmp_path, monkeypatch):
    """
    Verify exit code 1 is treated as successful scan with failed check findings.
    """
    target_dir = tmp_path / "iac"
    target_dir.mkdir()

    raw_checkov_output = {
        "check_type": "terraform",
        "results": {
            "failed_checks": [
                {
                    "check_id": "CKV_AWS_20",
                    "check_name": "Ensure S3 bucket ACL does not grant read to public",
                    "file_path": "/s3.tf",
                    "resource": "aws_s3_bucket.my_bucket",
                    "severity": "HIGH",
                    "guideline": "https://example.com"
                }
            ]
        }
    }

    def mock_subprocess_run(cmd, *args, **kwargs):
        assert kwargs.get("shell") is False or "shell" not in kwargs or kwargs.get("shell") is None
        assert cmd[0] == "checkov"
        mock_proc = MagicMock()
        mock_proc.returncode = 1  # Checkov returns 1 when policy violations exist
        mock_proc.stdout = json.dumps(raw_checkov_output)
        mock_proc.stderr = ""
        return mock_proc

    monkeypatch.setattr("shutil.which", lambda cmd: "checkov")
    monkeypatch.setattr("subprocess.run", mock_subprocess_run)

    result = await adapter.execute_scan(str(target_dir))

    assert result.scanner_name == "checkov"
    assert result.exit_code == 1
    assert len(result.parsed_items) == 1
    assert result.parsed_items[0]["check_id"] == "CKV_AWS_20"


@pytest.mark.asyncio
async def test_checkov_clean_scan(adapter, tmp_path, monkeypatch):
    """Verify exit code 0 is treated as clean scan with 0 failed checks."""
    target_dir = tmp_path / "clean_iac"
    target_dir.mkdir()

    raw_clean_output = {
        "check_type": "terraform",
        "results": {
            "failed_checks": []
        }
    }

    def mock_subprocess_run(cmd, *args, **kwargs):
        mock_proc = MagicMock()
        mock_proc.returncode = 0
        mock_proc.stdout = json.dumps(raw_clean_output)
        mock_proc.stderr = ""
        return mock_proc

    monkeypatch.setattr("shutil.which", lambda cmd: "checkov")
    monkeypatch.setattr("subprocess.run", mock_subprocess_run)

    result = await adapter.execute_scan(str(target_dir))
    assert result.exit_code == 0
    assert len(result.parsed_items) == 0


@pytest.mark.asyncio
async def test_checkov_timeout_handled_gracefully(adapter, tmp_path, monkeypatch):
    """Verify subprocess TimeoutExpired is captured cleanly."""
    target_dir = tmp_path / "iac_timeout"
    target_dir.mkdir()

    def mock_subprocess_timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired(cmd=["checkov"], timeout=120)

    monkeypatch.setattr("shutil.which", lambda cmd: "checkov")
    monkeypatch.setattr("subprocess.run", mock_subprocess_timeout)

    result = await adapter.execute_scan(str(target_dir))
    assert result.exit_code == 124
    assert "timed out" in result.raw_stderr.lower()


@pytest.mark.asyncio
async def test_checkov_demo_mode_fallback_when_binary_missing(adapter, tmp_path, monkeypatch):
    """Verify when binary is missing in DEMO_MODE, returns synthetic fixtures."""
    target_dir = tmp_path / "mock_saas"
    target_dir.mkdir()

    monkeypatch.setattr("shutil.which", lambda cmd: None)
    monkeypatch.setattr(settings, "DEFAULT_OPERATING_MODE", "DEMO_MODE")

    result = await adapter.execute_scan(str(target_dir))
    assert result.exit_code == 0
    assert len(result.parsed_items) >= 1
    assert any("CKV_AWS" in str(item) for item in result.parsed_items)


@pytest.mark.asyncio
async def test_checkov_malformed_json_resilience(adapter, tmp_path, monkeypatch):
    """Verify malformed JSON from checkov does not crash the adapter."""
    target_dir = tmp_path / "iac_corrupt"
    target_dir.mkdir()

    def mock_subprocess_run(cmd, *args, **kwargs):
        mock_proc = MagicMock()
        mock_proc.returncode = 1
        mock_proc.stdout = "Corrupted non-json output from crashed plugin"
        mock_proc.stderr = "Traceback error"
        return mock_proc

    monkeypatch.setattr("shutil.which", lambda cmd: "checkov")
    monkeypatch.setattr("subprocess.run", mock_subprocess_run)

    result = await adapter.execute_scan(str(target_dir))
    assert result.exit_code == 1
    assert len(result.parsed_items) == 0
    assert "Failed to parse Checkov JSON" in result.raw_stderr
