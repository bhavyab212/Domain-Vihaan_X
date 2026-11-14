# apps/backend/tests/test_security_operations_e2e.py
"""
End-to-End integration tests for Security Operations:
Covers TSK-009 (Risk Engine), TSK-011 (Gitleaks), TSK-012 (Checkov),
TSK-013 (HexStrike), TSK-014 (Subfinder), and AssessmentRunner orchestration.
"""

import pytest
from pathlib import Path
from unittest.mock import patch, AsyncMock

from app.orchestration.runner import AssessmentRunner, AssessmentReport
from app.integrations.scanners.gitleaks import GitleaksScannerAdapter
from app.integrations.scanners.checkov import CheckovScannerAdapter
from app.integrations.scanners.subfinder import SubfinderScannerAdapter
from app.integrations.scanners.hexstrike import (
    HexStrikeAdapter,
    SCAN_PROFILE_WEB_AUDIT
)
from app.intelligence.risk_engine import AssetContext, ContextualRiskEngine
from app.core.safety import SecurityBoundaryError
from app.core.config import settings


@pytest.fixture
def repo_target_path():
    root = Path(__file__).resolve().parents[3]
    return str(root / "data" / "demo" / "mock_saas" / "repo")


@pytest.fixture
def iac_target_path():
    root = Path(__file__).resolve().parents[3]
    return str(root / "data" / "demo" / "mock_saas" / "iac")


@pytest.mark.asyncio
async def test_network_scanners_demo_orchestration():
    """
    Verify complete orchestration across network scanners (Subfinder, HexStrike) in offline DEMO_MODE.
    All scanners must gracefully fall back to synthetic fixtures without throwing errors.
    """
    subfinder = SubfinderScannerAdapter()
    hexstrike = HexStrikeAdapter(endpoint_url="http://127.0.0.1:8888")

    # In DEMO_MODE, simulate missing binaries and unreachable HexStrike
    with patch.object(subfinder, "is_available", new_callable=AsyncMock, return_value=False), \
         patch.object(hexstrike, "is_available", new_callable=AsyncMock, return_value=False):

        runner = AssessmentRunner(adapters=[subfinder, hexstrike])
        target = "mock-saas.local"

        report = await runner.run_assessment(
            target=target,
            asset_id="asset-saas-core",
            asset_context=AssetContext(
                asset_id="asset-saas-core",
                criticality="CRITICAL",
                is_exposed=True,
                metadata={"pii": True}
            )
        )

        assert report.status == "completed"
        assert len(report.raw_results) == 2
        assert len(report.normalized_findings) > 0

        # Check telemetry for each scanner
        for name in ["subfinder", "hexstrike"]:
            assert name in report.scanner_telemetry
            assert report.scanner_telemetry[name]["exit_code"] == 0
            assert report.scanner_telemetry[name]["status"] == "COMPLETED"

        # Check contextual risk scoring
        assert 0.0 <= report.asset_risk_score <= 10.0
        assert report.asset_risk_level in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]


@pytest.mark.asyncio
async def test_code_scanners_demo_orchestration(repo_target_path, iac_target_path):
    """
    Verify Gitleaks and Checkov adapters normalize findings and calculate contextual risk.
    """
    gitleaks = GitleaksScannerAdapter()
    checkov = CheckovScannerAdapter()

    with patch.object(gitleaks, "is_available", new_callable=AsyncMock, return_value=False), \
         patch.object(checkov, "is_available", new_callable=AsyncMock, return_value=False):

        # Test Gitleaks runner on repo
        runner_repo = AssessmentRunner(adapters=[gitleaks])
        report_repo = await runner_repo.run_assessment(
            target=repo_target_path,
            asset_id="asset-repo-01",
            asset_context=AssetContext(
                asset_id="asset-repo-01",
                criticality="HIGH",
                is_exposed=False
            )
        )
        assert report_repo.status == "completed"
        assert len(report_repo.normalized_findings) > 0
        assert 0.0 <= report_repo.asset_risk_score <= 10.0

        # Test Checkov runner on IaC
        runner_iac = AssessmentRunner(adapters=[checkov])
        report_iac = await runner_iac.run_assessment(
            target=iac_target_path,
            asset_id="asset-iac-01",
            asset_context=AssetContext(
                asset_id="asset-iac-01",
                criticality="MEDIUM",
                is_exposed=False
            )
        )
        assert report_iac.status == "completed"
        assert len(report_iac.normalized_findings) > 0
        assert 0.0 <= report_iac.asset_risk_score <= 10.0


@pytest.mark.asyncio
async def test_security_boundary_enforcement_in_orchestration():
    """Verify unauthorized domains or forbidden paths raise SecurityBoundaryError."""
    subfinder = SubfinderScannerAdapter()
    hexstrike = HexStrikeAdapter(endpoint_url="http://127.0.0.1:8888")

    with pytest.raises(SecurityBoundaryError):
        await subfinder.execute_scan("unauthorized-malicious-domain.com")

    with pytest.raises(SecurityBoundaryError):
        await hexstrike.execute_scan("attacker-controlled.net")


@pytest.mark.asyncio
async def test_partial_failure_resilience_in_runner():
    """Verify that if one adapter fails or times out, the runner completes remaining scanners as 'partial'."""
    subfinder = SubfinderScannerAdapter()
    hexstrike = HexStrikeAdapter(endpoint_url="http://127.0.0.1:8888")

    # Mock hexstrike to fail with HTTP error, subfinder to succeed in demo mode
    with patch.object(subfinder, "is_available", new_callable=AsyncMock, return_value=False), \
         patch.object(hexstrike, "is_available", new_callable=AsyncMock, return_value=True), \
         patch("httpx.AsyncClient.post", side_effect=Exception("Connection reset by peer")):

        runner = AssessmentRunner(adapters=[subfinder, hexstrike])
        report = await runner.run_assessment(target="mock-saas.local", asset_id="asset-partial-test")

        assert report.status == "partial"
        assert report.scanner_telemetry["subfinder"]["status"] == "COMPLETED"
        assert report.scanner_telemetry["hexstrike"]["status"] in ["FAILED", "ERROR"]
        assert len(report.normalized_findings) > 0  # Subfinder findings survived
