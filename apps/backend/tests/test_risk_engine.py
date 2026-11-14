# apps/backend/tests/test_risk_engine.py
"""
Unit tests for Contextual Risk Scorer (TSK-009 / ADR-008):
Validates deterministic scoring, boundary clamping, CVSS handling, environment multipliers,
exposure multipliers, crown jewel impact, attack-path bonus, and provenance preservation.
"""

import pytest
from app.intelligence.risk_engine import (
    ContextualRiskEngine,
    ContextualRiskResult,
    AssetContext
)
from app.schemas.finding import FindingResponse, LocationInfo


def test_deterministic_scoring_same_inputs_same_score():
    """Verify identical inputs produce identical scores down to the hundredth."""
    asset = AssetContext(
        asset_id="asset-repo-01",
        name="saas-core-api",
        asset_type="REPOSITORY",
        criticality="CRITICAL",
        environment="PRODUCTION",
        is_exposed=True,
        is_crown_jewel=False
    )
    finding = FindingResponse(
        id="find-sec-01",
        title="Committed AWS IAM Key",
        description="Leaked AWS Key",
        severity="CRITICAL",
        scanner="gitleaks",
        assetId="asset-repo-01",
        cvssScore=9.5,
        provenance="OBSERVED",
        discoveredAt="2026-11-15T00:00:00Z"
    )

    res1 = ContextualRiskEngine.calculate_finding_risk(finding, asset, on_attack_path=True, path_confidence=0.95)
    res2 = ContextualRiskEngine.calculate_finding_risk(finding, asset, on_attack_path=True, path_confidence=0.95)

    assert isinstance(res1, ContextualRiskResult)
    assert res1.score == res2.score
    assert res1.severityBand == res2.severityBand
    assert res1.severityBand == "CRITICAL"
    assert res1.confidence == 0.95
    assert res1.provenance == "OBSERVED"
    assert 9.0 <= res1.score <= 10.0


def test_score_clamping_upper_and_lower_bounds():
    """Verify score is strictly clamped to [0.0, 10.0]."""
    # Extreme high input
    asset_extreme = AssetContext(
        asset_id="asset-crown",
        criticality="CRITICAL",
        environment="PRODUCTION",
        is_exposed=True,
        is_crown_jewel=True
    )
    finding_high = FindingResponse(
        id="find-max",
        title="RCE on Crown Jewel",
        description="RCE",
        severity="CRITICAL",
        scanner="checkov",
        assetId="asset-crown",
        cvssScore=10.0,
        provenance="OBSERVED",
        discoveredAt="2026-11-15T00:00:00Z"
    )
    res_high = ContextualRiskEngine.calculate_finding_risk(finding_high, asset_extreme, on_attack_path=True)
    assert res_high.score == 10.0
    assert res_high.score <= 10.0

    # Extreme low input
    asset_low = AssetContext(
        asset_id="asset-dev",
        criticality="LOW",
        environment="DEVELOPMENT",
        is_exposed=False,
        is_crown_jewel=False
    )
    finding_info = FindingResponse(
        id="find-info",
        title="Informational header",
        description="Info",
        severity="INFORMATIONAL",
        scanner="subfinder",
        assetId="asset-dev",
        cvssScore=0.0,
        provenance="OBSERVED",
        discoveredAt="2026-11-15T00:00:00Z"
    )
    res_low = ContextualRiskEngine.calculate_finding_risk(finding_info, asset_low, on_attack_path=False)
    assert res_low.score >= 0.0
    assert res_low.severityBand == "INFORMATIONAL"


def test_missing_cvss_handled_deterministically_without_fabrication():
    """Verify missing CVSS does not crash and defaults to severity baseline."""
    asset = AssetContext(asset_id="asset-1", criticality="MEDIUM", environment="STAGING")
    finding_no_cvss = FindingResponse(
        id="find-no-cvss",
        title="Checkov Misconfiguration",
        description="Desc",
        severity="HIGH",
        scanner="checkov",
        assetId="asset-1",
        cvssScore=None,  # Genuinely missing
        provenance="OBSERVED",
        discoveredAt="2026-11-15T00:00:00Z"
    )

    res = ContextualRiskEngine.calculate_finding_risk(finding_no_cvss, asset)
    assert res.score > 0.0
    assert res.breakdown["base_cvss"] is None
    assert res.breakdown["base_severity_score"] == 7.5  # Standard HIGH baseline
    assert "Base severity baseline (HIGH) applied (no raw CVSS)" in res.contributingFactors


def test_environment_multiplier_production_vs_development():
    """Verify production asset generates higher risk than development for identical finding."""
    finding = FindingResponse(
        id="find-sql",
        title="SQL Injection",
        description="Desc",
        severity="HIGH",
        scanner="trivy",
        assetId="dummy",
        cvssScore=8.0,
        provenance="OBSERVED",
        discoveredAt="2026-11-15T00:00:00Z"
    )

    asset_prod = AssetContext(asset_id="a-prod", criticality="HIGH", environment="PRODUCTION")
    asset_dev = AssetContext(asset_id="a-dev", criticality="HIGH", environment="DEVELOPMENT")

    res_prod = ContextualRiskEngine.calculate_finding_risk(finding, asset_prod)
    res_dev = ContextualRiskEngine.calculate_finding_risk(finding, asset_dev)

    assert res_prod.score > res_dev.score
    assert any("PRODUCTION" in factor for factor in res_prod.contributingFactors)
    assert any("DEVELOPMENT" in factor for factor in res_dev.contributingFactors)


def test_attack_path_bonus_increases_risk_measurably():
    """Verify being an active hop on a discovered attack path adds a measurable bonus."""
    asset = AssetContext(asset_id="asset-repo", criticality="HIGH", environment="PRODUCTION")
    finding = FindingResponse(
        id="find-1",
        title="Secret",
        description="Desc",
        severity="CRITICAL",
        scanner="gitleaks",
        assetId="asset-repo",
        cvssScore=9.0,
        provenance="SIMULATED_DEMO",
        discoveredAt="2026-11-15T00:00:00Z"
    )

    res_isolated = ContextualRiskEngine.calculate_finding_risk(finding, asset, on_attack_path=False)
    res_in_path = ContextualRiskEngine.calculate_finding_risk(
        finding, asset, on_attack_path=True, path_confidence=0.96, path_id="path-01"
    )

    assert res_in_path.score > res_isolated.score
    assert res_in_path.breakdown["attack_path_bonus"] > 0.0
    assert any("attack path" in f.lower() for f in res_in_path.contributingFactors)
    assert "path-01" in res_in_path.evidenceReferences
    assert res_in_path.provenance == "SIMULATED_DEMO"


def test_crown_jewel_multiplier_elevates_asset_risk():
    """Verify crown jewel designation increases risk."""
    finding = FindingResponse(
        id="find-s3",
        title="Misconfigured S3 Bucket",
        description="Bucket",
        severity="MEDIUM",
        scanner="checkov",
        assetId="a-storage",
        cvssScore=6.0,
        provenance="OBSERVED",
        discoveredAt="2026-11-15T00:00:00Z"
    )
    asset_normal = AssetContext(asset_id="a-storage", criticality="MEDIUM", is_crown_jewel=False)
    asset_jewel = AssetContext(asset_id="a-storage", criticality="MEDIUM", is_crown_jewel=True)

    res_normal = ContextualRiskEngine.calculate_finding_risk(finding, asset_normal)
    res_jewel = ContextualRiskEngine.calculate_finding_risk(finding, asset_jewel)

    assert res_jewel.score > res_normal.score
    assert any("Crown jewel" in f for f in res_jewel.contributingFactors)



def test_composite_asset_risk_calculation():
    """Verify multi-finding asset risk aggregates asymptotically without unbounded runaway."""
    asset = AssetContext(asset_id="a-1", criticality="HIGH", environment="PRODUCTION")
    f1 = FindingResponse(
        id="f1", title="f1", description="d", severity="HIGH", scanner="s", assetId="a-1", cvssScore=8.0,
        provenance="OBSERVED", discoveredAt="2026-11-15T00:00:00Z"
    )
    f2 = FindingResponse(
        id="f2", title="f2", description="d", severity="MEDIUM", scanner="s", assetId="a-1", cvssScore=5.5,
        provenance="OBSERVED", discoveredAt="2026-11-15T00:00:00Z"
    )

    composite = ContextualRiskEngine.calculate_composite_asset_risk(asset, [f1, f2])
    single = ContextualRiskEngine.calculate_finding_risk(f1, asset)

    assert composite.score >= single.score
    assert composite.score <= 10.0
    assert "f1" in composite.evidenceReferences
    assert "f2" in composite.evidenceReferences
