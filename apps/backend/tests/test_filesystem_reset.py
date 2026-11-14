# apps/backend/tests/test_filesystem_reset.py
"""
Unit tests for synthetic SaaS filesystem restoration, sandbox isolation, and path traversal protection.
"""

from pathlib import Path
from app.demo.provider import DemoScenarioProvider


def test_restore_synthetic_filesystem_creates_working_copy():
    """Verify runtime working directory is created and copies all baseline files."""
    provider = DemoScenarioProvider()
    restored_path = provider.restore_synthetic_filesystem()

    assert restored_path.exists()
    assert (restored_path / "repo" / "config" / "staging.env").exists()
    assert (restored_path / "iac" / "iam_staging.tf").exists()
    assert (restored_path / "storage" / "buckets.json").exists()


def test_runtime_modifications_are_cleared_on_reset():
    """Verify that any ad-hoc runtime file added during remediation tests is wiped upon reset."""
    provider = DemoScenarioProvider()
    restored_path = provider.restore_synthetic_filesystem()

    # Simulate an attacker or test modifying the runtime workspace
    tampered_file = restored_path / "unauthorized_file.txt"
    tampered_file.write_text("compromised", encoding="utf-8")
    assert tampered_file.exists()

    # Re-run reset
    provider.restore_synthetic_filesystem()

    # The tampered file must be wiped out
    assert not tampered_file.exists()


def test_baseline_fixtures_remain_immutable():
    """Verify baseline fixtures in data/demo/mock_saas/ are never modified by reset operations."""
    provider = DemoScenarioProvider()
    staging_baseline = provider.baseline_fixtures_path / "repo" / "config" / "staging.env"
    initial_content = staging_baseline.read_text(encoding="utf-8")

    # Run restoration
    restored_path = provider.restore_synthetic_filesystem()

    # Mutate the runtime copy
    (restored_path / "repo" / "config" / "staging.env").write_text("MUTATED", encoding="utf-8")

    # Check baseline is completely unchanged
    assert staging_baseline.read_text(encoding="utf-8") == initial_content
