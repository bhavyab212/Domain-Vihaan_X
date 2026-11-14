# apps/backend/tests/test_normalizer.py
"""
Unit tests for FindingNormalizer:
Validates Gitleaks secret redaction, Checkov IaC parsing, Trivy CVE mapping,
Subfinder enumeration, deterministic fingerprinting, deduplication, and quarantine resilience.
"""

import json
from pathlib import Path
import pytest

from app.intelligence.normalizer import (
    FindingNormalizer,
    compute_finding_fingerprint,
    redact_secret_values,
    NormalizationResult
)

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_secret_redaction_utility():
    """Verify raw credentials and private keys are aggressively redacted."""
    raw = "Found key AKIAIOSFODNN7EXAMPLE in config"
    redacted = redact_secret_values(raw, specific_secret="AKIAIOSFODNN7EXAMPLE")
    assert "AKIAIOSFODNN7EXAMPLE" not in redacted
    assert "***REDACTED***" in redacted


def test_deterministic_finding_fingerprint():
    """Verify identical parameters produce exact same fingerprint."""
    fp1 = compute_finding_fingerprint("gitleaks", "asset-1", "rule-aws", "config.env:14")
    fp2 = compute_finding_fingerprint("gitleaks", "asset-1", "rule-aws", "config.env:14")
    fp3 = compute_finding_fingerprint("gitleaks", "asset-2", "rule-aws", "config.env:14")

    assert fp1 == fp2
    assert fp1 != fp3
    assert fp1.startswith("find-")


def test_normalize_gitleaks_redacts_secrets():
    """Verify Gitleaks normalization redacts secrets and formats location."""
    raw_fixture = json.loads((FIXTURES_DIR / "gitleaks_output.json").read_text(encoding="utf-8"))
    findings = FindingNormalizer.normalize_gitleaks(raw_fixture, asset_id="asset-repo-01", provenance="OBSERVED")

    assert len(findings) == 2
    for f in findings:
        assert f.scanner == "gitleaks"
        assert f.assetId == "asset-repo-01"
        assert f.severity == "CRITICAL"
        assert f.provenance == "OBSERVED"
        # CRITICAL SECURITY ASSERTION: No raw secret leaked in description or title
        assert "AKIAIOSFODNN7EXAMPLE" not in f.description
        assert "AKIAIOSFODNN7EXAMPLE" not in f.title
        assert "-----BEGIN RSA PRIVATE KEY-----" not in f.description
        assert f.location is not None
        assert f.location.file in {"config/staging.env", "certs/server.key"}


def test_normalize_checkov_failed_checks():
    """Verify Checkov normalization captures check_id, line range, and guideline."""
    raw_fixture = json.loads((FIXTURES_DIR / "checkov_output.json").read_text(encoding="utf-8"))
    findings = FindingNormalizer.normalize_checkov(raw_fixture, asset_id="asset-cloud-01")

    assert len(findings) == 2
    f_s3 = next(f for f in findings if "CKV_AWS_20" in f.remediationGuidance)
    assert f_s3.severity == "HIGH"
    assert f_s3.location.file == "/iac/s3_storage.tf"
    assert f_s3.location.line == 10
    assert f_s3.location.resource == "aws_s3_bucket.customer_vault"

    f_iam = next(f for f in findings if "CKV_AWS_108" in f.remediationGuidance)
    assert f_iam.severity == "CRITICAL"
    assert f_iam.location.resource == "aws_iam_policy.wildcard_admin"


def test_normalize_trivy_cves():
    """Verify Trivy normalizes CVEs, packages, and CVSS scores accurately."""
    raw_fixture = json.loads((FIXTURES_DIR / "trivy_output.json").read_text(encoding="utf-8"))
    findings = FindingNormalizer.normalize_trivy(raw_fixture, asset_id="asset-container-01")

    assert len(findings) == 2
    cve_crit = next(f for f in findings if f.cveId == "CVE-2023-26159")
    assert cve_crit.severity == "CRITICAL"
    assert cve_crit.cvssScore == 7.5
    assert "follow-redirects@1.15.2" in cve_crit.location.resource
    assert "Upgrade package 'follow-redirects' to version 1.15.4" in cve_crit.remediationGuidance

    cve_med = next(f for f in findings if f.cveId == "CVE-2022-25883")
    assert cve_med.severity == "MEDIUM"
    assert cve_med.cvssScore == 5.3


def test_normalize_subfinder_hosts():
    """Verify Subfinder normalizes external host findings."""
    raw_fixture = json.loads((FIXTURES_DIR / "subfinder_output.json").read_text(encoding="utf-8"))
    findings = FindingNormalizer.normalize_subfinder(raw_fixture, asset_id="asset-domain-01")

    assert len(findings) == 2
    staging_finding = next(f for f in findings if "staging-api.mocksaas.com" in f.title)
    assert staging_finding.severity == "MEDIUM"  # Staging keyword flagged
    assert staging_finding.location.resource == "staging-api.mocksaas.com"

    admin_finding = next(f for f in findings if "admin-portal.mocksaas.com" in f.title)
    assert admin_finding.severity == "MEDIUM"


def test_malformed_json_quarantine_resilience():
    """Verify normalizer quarantines broken JSON without crashing."""
    corrupted_json = '{"unclosed": "brace'
    res = FindingNormalizer.normalize(
        scanner="gitleaks",
        raw_data=corrupted_json,
        asset_id="asset-1"
    )

    assert isinstance(res, NormalizationResult)
    assert len(res.findings) == 0
    assert len(res.quarantined) == 1
    assert "JSONDecodeError" in res.quarantined[0].error
    assert res.quarantined[0].scanner == "gitleaks"


def test_unsupported_scanner_quarantine():
    """Verify unrecognized scanner type is safely quarantined."""
    res = FindingNormalizer.normalize(
        scanner="unsupported_scanner_xyz",
        raw_data={"foo": "bar"},
        asset_id="asset-1"
    )
    assert len(res.findings) == 0
    assert len(res.quarantined) == 1
    assert "Unsupported scanner engine" in res.quarantined[0].error


def test_deduplication_of_findings():
    """Verify duplicate scanner items produce deduplicated findings."""
    raw_fixture = json.loads((FIXTURES_DIR / "gitleaks_output.json").read_text(encoding="utf-8"))
    # Duplicate items in input
    duplicated_input = raw_fixture + raw_fixture

    res = FindingNormalizer.normalize(
        scanner="gitleaks",
        raw_data=duplicated_input,
        asset_id="asset-repo-01"
    )

    # 2 unique findings instead of 4
    assert len(res.findings) == 2
