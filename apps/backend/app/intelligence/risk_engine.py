# apps/backend/app/intelligence/risk_engine.py
"""
Deterministic Contextual Risk Scoring Engine (ADR-008).
Computes bounded 0.0 - 10.0 risk scores based on grounded asset context,
finding severity, CVSS scores, environment, attack-path connectivity, and crown-jewel status.
"""

from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field

from app.schemas.finding import FindingResponse, SeverityType, ProvenanceType


class AssetContext(BaseModel):
    asset_id: str
    name: Optional[str] = None
    asset_type: str = "ASSET"
    criticality: str = "MEDIUM"  # CRITICAL, HIGH, MEDIUM, LOW
    environment: str = "PRODUCTION"  # PRODUCTION, STAGING, DEVELOPMENT
    is_exposed: bool = False
    is_crown_jewel: bool = False
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ContextualRiskResult(BaseModel):
    score: float = Field(..., ge=0.0, le=10.0)
    severityBand: SeverityType
    contributingFactors: List[str]
    evidenceReferences: List[str]
    confidence: float = Field(..., ge=0.0, le=1.0)
    provenance: ProvenanceType
    breakdown: Dict[str, Any]


class ContextualRiskEngine:
    """
    Deterministic Contextual Risk Scorer conforming to ADR-008.
    Ensures mathematical determinism and strict bounding within [0.0, 10.0].
    """

    SEVERITY_BASELINES = {
        "CRITICAL": 9.0,
        "HIGH": 7.5,
        "MEDIUM": 5.0,
        "LOW": 2.5,
        "INFORMATIONAL": 0.5,
    }

    CRITICALITY_WEIGHTS = {
        "CRITICAL": 1.25,
        "HIGH": 1.10,
        "MEDIUM": 1.00,
        "LOW": 0.85,
    }

    ENVIRONMENT_WEIGHTS = {
        "PRODUCTION": 1.15,
        "STAGING": 1.00,
        "DEVELOPMENT": 0.85,
    }

    @staticmethod
    def get_severity_band(score: float) -> SeverityType:
        if score >= 9.0:
            return "CRITICAL"
        if score >= 7.0:
            return "HIGH"
        if score >= 4.0:
            return "MEDIUM"
        if score >= 1.0:
            return "LOW"
        return "INFORMATIONAL"

    @classmethod
    def calculate_finding_risk(
        cls,
        finding: FindingResponse,
        asset: Optional[AssetContext] = None,
        on_attack_path: bool = False,
        path_confidence: float = 1.0,
        path_id: Optional[str] = None,
    ) -> ContextualRiskResult:
        factors: List[str] = []
        evidence: List[str] = [finding.id]
        if asset:
            evidence.append(asset.asset_id)
        if path_id:
            evidence.append(path_id)

        # 1. Base Score (CVSS or Severity Baseline)
        has_raw_cvss = finding.cvssScore is not None and 0.0 <= finding.cvssScore <= 10.0
        if has_raw_cvss:
            base_score = float(finding.cvssScore)
            factors.append(f"Grounded CVSS v3 score ({base_score:.1f})")
        else:
            base_score = cls.SEVERITY_BASELINES.get(finding.severity, 5.0)
            factors.append(f"Base severity baseline ({finding.severity}) applied (no raw CVSS)")

        # 2. Contextual Multipliers
        crit_key = (asset.criticality if asset else "MEDIUM").upper()
        w_crit = cls.CRITICALITY_WEIGHTS.get(crit_key, 1.00)
        if w_crit != 1.00:
            factors.append(f"Asset criticality {crit_key} ({w_crit:+.2f}x)")

        env_key = (asset.environment if asset else "PRODUCTION").upper()
        w_env = cls.ENVIRONMENT_WEIGHTS.get(env_key, 1.00)
        if w_env != 1.00:
            factors.append(f"Target environment {env_key} ({w_env:+.2f}x)")

        w_exp = 1.15 if (asset and asset.is_exposed) else 1.00
        if w_exp > 1.00:
            factors.append("Asset externally exposed to attack surface (+15%)")

        w_jewel = 1.20 if (asset and asset.is_crown_jewel) else 1.00
        if w_jewel > 1.00:
            factors.append("Crown jewel asset designation (+20%)")

        # 3. Attack Path Connectivity Bonus
        path_bonus = 0.0
        if on_attack_path:
            severity_factor = base_score / 10.0
            path_bonus = 1.50 * path_confidence * severity_factor
            factors.append(
                f"Active step on critical attack path (bonus +{path_bonus:.2f}, confidence {path_confidence:.2f})"
            )

        # 4. Final Score Calculation & Clamping
        combined_multiplier = w_crit * w_env * w_exp * w_jewel
        scaled_base = base_score * (combined_multiplier / 1.15)
        raw_score = scaled_base + path_bonus
        final_score = round(max(0.0, min(10.0, raw_score)), 2)

        confidence = round(path_confidence if on_attack_path else 1.0, 2)
        provenance = finding.provenance

        breakdown = {
            "base_cvss": finding.cvssScore,
            "base_severity_score": base_score,
            "criticality_multiplier": w_crit,
            "environment_multiplier": w_env,
            "exposure_multiplier": w_exp,
            "crown_jewel_multiplier": w_jewel,
            "attack_path_bonus": round(path_bonus, 2),
            "raw_score": round(raw_score, 2),
            "final_score": final_score,
        }

        return ContextualRiskResult(
            score=final_score,
            severityBand=cls.get_severity_band(final_score),
            contributingFactors=factors,
            evidenceReferences=evidence,
            confidence=confidence,
            provenance=provenance,
            breakdown=breakdown,
        )

    @classmethod
    def calculate_composite_asset_risk(
        cls,
        asset: AssetContext,
        findings: List[FindingResponse],
        attack_paths: Optional[List[Any]] = None,
    ) -> ContextualRiskResult:
        """
        Asymptotically aggregates multiple finding risk scores for an asset
        without unbounded inflation:
        Composite = highest + 0.15 * sum(remaining)
        """
        if not findings:
            return ContextualRiskResult(
                score=0.0,
                severityBand="INFORMATIONAL",
                contributingFactors=["Zero reported security findings for this asset"],
                evidenceReferences=[asset.asset_id],
                confidence=1.0,
                provenance="OBSERVED",
                breakdown={"findings_count": 0, "final_score": 0.0},
            )

        finding_risks = [
            cls.calculate_finding_risk(f, asset) for f in findings
        ]
        finding_risks.sort(key=lambda r: r.score, reverse=True)

        highest = finding_risks[0].score
        remaining_sum = sum(r.score for r in finding_risks[1:])
        composite_raw = highest + (0.15 * remaining_sum)
        final_score = round(max(0.0, min(10.0, composite_raw)), 2)

        evidence = [asset.asset_id] + [f.id for f in findings]
        factors = [
            f"Highest single finding risk: {highest:.2f} ({finding_risks[0].severityBand})",
            f"Aggregated residual risk from {len(findings) - 1} additional findings (+{0.15 * remaining_sum:.2f})",
        ]
        if asset.is_crown_jewel:
            factors.append("Asset is designated crown jewel")

        provenances = {f.provenance for f in findings}
        provenance = "SIMULATED_DEMO" if "SIMULATED_DEMO" in provenances else "OBSERVED"

        return ContextualRiskResult(
            score=final_score,
            severityBand=cls.get_severity_band(final_score),
            contributingFactors=factors,
            evidenceReferences=evidence,
            confidence=1.0,
            provenance=provenance,
            breakdown={
                "highest_finding_score": highest,
                "additional_findings_count": len(findings) - 1,
                "residual_contribution": round(0.15 * remaining_sum, 2),
                "final_score": final_score,
            },
        )
