# apps/backend/tests/test_gitleaks_adapter.py
"""
Unit tests for Gitleaks CLI Subprocess Adapter (TSK-011):
Validates safe subprocess execution (shell=False), target validation, exit code semantics (0=clean, 1=leaks),
secret redaction, timeout handling, and offline DEMO_MODE fallback.
"""

import json
import subprocess
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from app.integrations.scanners.gitleaks import GitleaksScannerAdapter
from app.core.safety import SecurityBoundaryError
from app.core.config import settings


@pytest.fixture
def adapter():
    return GitleaksScannerAdapter()


@pytest.mark.asyncio
async def test_gitleaks_is_available(adapter, monkeypatch):
    """Verify is_available correctly queries system PATH."""
    monkeypatch.setattr("shutil.which", lambda cmd: "/usr/local/bin/gitleaks" if cmd == "gitleaks" else None)
    assert await adapter.is_available() is True

    monkeypatch.setattr("shutil.which", lambda cmd: None)
    assert await adapter.is_available() is False


@pytest.mark.asyncio
async def test_gitleaks_unsafe_target_path_rejected(adapter):
    """Verify target path outside approved sandbox raises SecurityBoundaryError."""
    unsafe_paths = ["/etc/passwd", "C:\\Windows\\System32", "../../../sensitive_folder"]
    for path in unsafe_paths:
        with pytest.raises(SecurityBoundaryError):
            await adapter.execute_scan(path)


@pytest.mark.asyncio
async def test_gitleaks_successful_scan_with_leaks_and_redaction(adapter, tmp_path, monkeypatch):
    """
    Verify exit code 1 is treated as valid scan with findings,
    and raw secret values are redacted from output.
    """
    # Create valid dummy target directory within tmp_path
    target_dir = tmp_path / "repo"
    target_dir.mkdir()

    raw_leaks = [
        {
            "Description": "AWS Access Key",
            "File": "config.env",
            "StartLine": 12,
            "Secret": "AKIAIOSFODNN7EXAMPLE",
            "Match": "AKIAIOSFODNN7EXAMPLE",
            "RuleID": "aws-access-key"
        }
    ]

    def mock_subprocess_run(cmd, *args, **kwargs):
        # Assert safe execution parameters
        assert kwargs.get("shell") is False or "shell" not in kwargs or kwargs.get("shell") is None
        assert cmd[0] == "gitleaks"
        # Find report-path parameter
        report_idx = cmd.index("--report-path") + 1
        report_file = Path(cmd[report_idx])
        report_file.parent.mkdir(parents=True, exist_ok=True)
        report_file.write_text(json.dumps(raw_leaks), encoding="utf-8")

        mock_proc = MagicMock()
        mock_proc.returncode = 1  # Gitleaks returns 1 when leaks are found
        mock_proc.stdout = "Gitleaks scan complete: 1 leak found."
        mock_proc.stderr = ""
        return mock_proc

    monkeypatch.setattr("shutil.which", lambda cmd: "gitleaks")
    monkeypatch.setattr("subprocess.run", mock_subprocess_run)

    result = await adapter.execute_scan(str(target_dir))

    assert result.scanner_name == "gitleaks"
    assert result.exit_code == 1
    assert len(result.parsed_items) == 1
    assert result.parsed_items[0]["Description"] == "AWS Access Key"
    # Ensure raw secret is redacted
    assert "AKIAIOSFODNN7EXAMPLE" not in result.raw_stdout
    assert result.parsed_items[0].get("Secret") == "***REDACTED***"


@pytest.mark.asyncio
async def test_gitleaks_clean_scan(adapter, tmp_path, monkeypatch):
    """Verify exit code 0 is treated as clean scan with 0 leaks."""
    target_dir = tmp_path / "clean_repo"
    target_dir.mkdir()

    def mock_subprocess_run(cmd, *args, **kwargs):
        report_idx = cmd.index("--report-path") + 1
        report_file = Path(cmd[report_idx])
        report_file.parent.mkdir(parents=True, exist_ok=True)
        report_file.write_text("[]", encoding="utf-8")

        mock_proc = MagicMock()
        mock_proc.returncode = 0
        mock_proc.stdout = "No leaks found."
        mock_proc.stderr = ""
        return mock_proc

    monkeypatch.setattr("shutil.which", lambda cmd: "gitleaks")
    monkeypatch.setattr("subprocess.run", mock_subprocess_run)

    result = await adapter.execute_scan(str(target_dir))
    assert result.exit_code == 0
    assert len(result.parsed_items) == 0


@pytest.mark.asyncio
async def test_gitleaks_timeout_handled_gracefully(adapter, tmp_path, monkeypatch):
    """Verify subprocess TimeoutExpired is captured and returns timed out diagnostic result."""
    target_dir = tmp_path / "repo_timeout"
    target_dir.mkdir()

    def mock_subprocess_timeout(*args, **kwargs):
        raise subprocess.TimeoutExpired(cmd=["gitleaks"], timeout=60)

    monkeypatch.setattr("shutil.which", lambda cmd: "gitleaks")
    monkeypatch.setattr("subprocess.run", mock_subprocess_timeout)

    result = await adapter.execute_scan(str(target_dir))
    assert result.exit_code == 124
    assert "timed out" in result.raw_stderr.lower()


@pytest.mark.asyncio
async def test_gitleaks_demo_mode_fallback_when_binary_missing(adapter, tmp_path, monkeypatch):
    """Verify when binary is missing in DEMO_MODE, returns synthetic fixtures without error."""
    target_dir = tmp_path / "mock_saas"
    target_dir.mkdir()

    monkeypatch.setattr("shutil.which", lambda cmd: None)
    monkeypatch.setattr(settings, "DEFAULT_OPERATING_MODE", "DEMO_MODE")

    result = await adapter.execute_scan(str(target_dir))
    assert result.exit_code == 0
    assert len(result.parsed_items) >= 1
    assert any("Secret" in str(item) or "AWS" in str(item) for item in result.parsed_items)
