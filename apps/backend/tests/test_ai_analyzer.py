# apps/backend/tests/test_ai_analyzer.py
"""
Test suite for Grounded AI Analysis and Deterministic Rule Fallback (TSK-015).
Validates evidence grounding, anti-hallucination guarantees, offline sub-50ms performance,
timeout resilience, and canonical API endpoints.
"""

import time
import pytest
from unittest.mock import patch, MagicMock, AsyncMock

from app.schemas.ai import AIAnalysisResponse, EvidenceReference
from app.ai.rule_fallback import RuleBasedFallbackEngine
from app.ai.analyzer import AISecurityAnalyst
from app.core.exceptions import ResourceNotFoundError


SAMPLE_PATH_DATA = {
    "id": "path-01",
    "title": "Public Repo to Customer PII Vault Exfiltration",
    "summary": "Staging AWS key leaked in public repo allows assuming deployer role with s3:* wildcard access to customer PII backup.",
    "severity": "CRITICAL",
    "confidenceScore": 0.95,
    "isSimulated": True,
    "entryPointAssetId": "asset-repo-01",
    "crownJewelAssetId": "asset-s3-pii-vault",
    "steps": [
        {
            "stepNumber": 1,
            "assetId": "asset-repo-01",
            "findingId": "find-gitleaks-01",
            "description": "Exposed AWS access key detected in staging.env",
            "technique": "T1552.001",
            "mitreTactic": "Credential Access"
        },
        {
            "stepNumber": 2,
            "assetId": "asset-iam-staging-role",
            "findingId": "find-checkov-01",
            "description": "IAM role has wildcard s3:* permissions on all resources",
            "technique": "T1078.004",
            "mitreTactic": "Privilege Escalation"
        },
        {
            "stepNumber": 3,
            "assetId": "asset-s3-pii-vault",
            "findingId": None,
            "description": "Customer PII storage bucket containing sensitive user data",
            "technique": "T1530",
            "mitreTactic": "Exfiltration"
        }
    ],
    "status": "ACTIVE"
}


def test_rule_fallback_deterministic_output_and_latency():
    """Verify embedded rule engine generates structured analysis in under 50ms without external calls."""
    start_time = time.perf_counter()
    analysis = RuleBasedFallbackEngine.analyze_path(SAMPLE_PATH_DATA)
    duration_ms = (time.perf_counter() - start_time) * 1000

    assert isinstance(analysis, AIAnalysisResponse)
    assert analysis.attackPathId == "path-01"
    assert "Customer PII Vault" in analysis.title
    assert analysis.groundedMode == "RULE_ENGINE_DETERMINISTIC"
    assert analysis.provenance == "SIMULATED_DEMO"
    assert duration_ms < 50.0  # Must be sub-50ms for reliable offline demos
    assert analysis.chokePointAssetId == "asset-iam-staging-role"
    assert "least-privilege" in analysis.recommendedAction.lower() or "wildcard" in analysis.recommendedAction.lower()


def test_anti_hallucination_and_evidence_grounding():
    """Verify that every security fact references input evidence without hallucinating fake CVEs or IPs."""
    analysis = RuleBasedFallbackEngine.analyze_path(SAMPLE_PATH_DATA)

    # Check evidence references contain real IDs from path
    ref_ids = [ref.id for ref in analysis.evidenceReferences]
    assert "asset-repo-01" in ref_ids
    assert "asset-iam-staging-role" in ref_ids
    assert "asset-s3-pii-vault" in ref_ids
    assert "find-gitleaks-01" in ref_ids

    # Anti-hallucination checks: text must not invent random external CVEs or external IPs
    full_text = f"{analysis.killChainSummary} {analysis.rootCauseAnalysis} {analysis.businessImpact}"
    assert "CVE-2099" not in full_text
    assert "198.51.100." not in full_text
    assert "CONFIRMED_EXPLOIT" not in full_text
    assert "potential" in full_text.lower() or "risk" in full_text.lower()


@pytest.mark.asyncio
async def test_ai_analyzer_missing_key_degrades_gracefully():
    """Verify AISecurityAnalyst falls back to rule engine when API key is empty."""
    with patch("app.ai.analyzer.settings.GEMINI_API_KEY", ""):
        analyst = AISecurityAnalyst()
        analysis = await analyst.analyze_attack_path(SAMPLE_PATH_DATA)

        assert isinstance(analysis, AIAnalysisResponse)
        assert analysis.groundedMode == "RULE_ENGINE_DETERMINISTIC"
        assert analysis.attackPathId == "path-01"


@pytest.mark.asyncio
async def test_ai_analyzer_timeout_falls_back():
    """Verify timeout on external LLM call triggers deterministic fallback without crashing."""
    with patch("app.ai.analyzer.settings.GEMINI_API_KEY", "mock-key-123"), \
         patch("app.ai.analyzer.settings.DEFAULT_OPERATING_MODE", "LIVE_ASSESSMENT_MODE"):
        analyst = AISecurityAnalyst()
        with patch.object(analyst, "_query_external_llm", side_effect=TimeoutError("LLM call timed out after 4s")):
            analysis = await analyst.analyze_attack_path(SAMPLE_PATH_DATA)

            assert isinstance(analysis, AIAnalysisResponse)
            assert analysis.groundedMode == "RULE_ENGINE_DETERMINISTIC"
            assert any("fallback" in u.lower() or "timeout" in u.lower() for u in analysis.uncertainties)


def test_api_v1_ai_analyze_endpoint_success(client):
    """Verify POST /api/v1/ai/analyze/{path_id} returns HTTP 200 with typed analysis."""
    # Reset demo first so path-01 is seeded
    client.post("/api/v1/demo/reset")

    response = client.post("/api/v1/ai/analyze/path-01")
    assert response.status_code == 200
    data = response.json()

    assert data["attackPathId"] == "path-01"
    assert "killChainSummary" in data
    assert "rootCauseAnalysis" in data
    assert "businessImpact" in data
    assert "chokePointAssetId" in data
    assert len(data["evidenceReferences"]) >= 2
    assert data["groundedMode"] in ["RULE_ENGINE_DETERMINISTIC", "LLM_GROUNDED"]
    assert data["responseTimeMs"] >= 0


def test_api_v1_ai_analyze_endpoint_not_found(client):
    """Verify POST /api/v1/ai/analyze/nonexistent returns HTTP 404."""
    response = client.post("/api/v1/ai/analyze/nonexistent-path-999")
    assert response.status_code == 404
    data = response.json()
    assert "error" in data or "message" in data
