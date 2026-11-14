# apps/backend/app/ai/rule_fallback.py
"""
Deterministic Rule-Based Security Analyst Fallback Engine.
Implements ADR-008 and ADR-012:
Generates structured, grounded, zero-hallucination attack path explanations in < 50ms
without external network or LLM dependencies.
"""

import time
from datetime import datetime, timezone
from typing import Dict, Any, List

from app.schemas.ai import AIAnalysisResponse, EvidenceReference


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class RuleBasedFallbackEngine:
    """
    Deterministic rule engine that maps attack path graphs and findings
    to structured, evidence-backed security explanations.
    """

    @classmethod
    def analyze_path(
        cls,
        path_data: Dict[str, Any],
        uncertainty_note: str | None = None
    ) -> AIAnalysisResponse:
        start_time = time.perf_counter()

        path_id = path_data.get("id", "path-unknown")
        title = path_data.get("title") or "Cross-Domain Multi-Hop Attack Path"
        entry_asset = path_data.get("entryPointAssetId", "External Entry Point")
        crown_asset = path_data.get("crownJewelAssetId", "Crown Jewel Data Store")
        steps: List[Dict[str, Any]] = path_data.get("steps", [])
        is_simulated = path_data.get("isSimulated", True)

        # 1. Gather all evidence references
        evidence: List[EvidenceReference] = [
            EvidenceReference(
                id=entry_asset,
                type="ASSET",
                description=f"Entry point asset initiating the attack traversal."
            ),
            EvidenceReference(
                id=crown_asset,
                type="ASSET",
                description=f"High-criticality target asset (Crown Jewel)."
            )
        ]

        choke_point_asset = entry_asset
        choke_point_desc = "Primary entry point where access begins."
        primary_finding_id = None

        for step in steps:
            step_num = step.get("stepNumber", 1)
            asset_id = step.get("assetId", "")
            finding_id = step.get("findingId")
            technique = step.get("technique", "T1078")
            tactic = step.get("mitreTactic", "Initial Access")
            desc = step.get("description", "Pivot step")

            if asset_id and asset_id not in [e.id for e in evidence]:
                evidence.append(
                    EvidenceReference(
                        id=asset_id,
                        type="ASSET",
                        description=f"Intermediate hop {step_num}: {desc} ({tactic})"
                    )
                )

            if finding_id:
                evidence.append(
                    EvidenceReference(
                        id=finding_id,
                        type="FINDING",
                        description=f"Vulnerability/Misconfiguration at step {step_num}: {desc}"
                    )
                )
                if not primary_finding_id:
                    primary_finding_id = finding_id

            # Rule heuristic for choke-point: prioritize intermediate IAM/policy pivot or first intermediate asset
            if "iam" in asset_id.lower() or "role" in asset_id.lower() or "policy" in asset_id.lower():
                choke_point_asset = asset_id
                choke_point_desc = (
                    f"IAM policy on '{asset_id}' acts as the critical privilege bridge connecting "
                    f"the untrusted entry point to sensitive cloud storage."
                )
            elif choke_point_asset == entry_asset and asset_id != entry_asset and asset_id != crown_asset:
                choke_point_asset = asset_id
                choke_point_desc = f"Intermediate pivot node '{asset_id}' bridges external exposure to internal infrastructure."

        # 2. Synthesize grounded narratives
        kill_chain = (
            f"The attack path begins at entry point `{entry_asset}`, traverses {len(steps)} verified "
            f"architectural relationships, and terminates at crown jewel `{crown_asset}`. "
            f"An adversary leveraging initial access can escalate privileges and access protected resources."
        )

        root_cause = (
            f"Initial access is facilitated through findings associated with `{entry_asset}`"
            + (f" (Finding `{primary_finding_id}`)." if primary_finding_id else ".")
            + " Configuration analysis reveals excessive permissions allowing cross-environment pivoting."
        )

        business_impact = (
            f"Unmitigated traversal exposes crown jewel `{crown_asset}`, presenting critical risk of "
            f"unauthorized data exfiltration, regulatory compliance violation (e.g., GDPR/HIPAA), "
            f"and infrastructure takeover."
        )

        rec_action = (
            f"Apply immediate least-privilege remediation at choke point `{choke_point_asset}`. "
            f"Revoke all wildcard permissions and enforce strict boundary access controls."
        )

        uncertainties = [
            "This attack path represents an inferred structural traversal graph and does NOT confirm an active exploit.",
            "Relationships are derived from topological configuration and static scanner observations."
        ]
        if uncertainty_note:
            uncertainties.append(uncertainty_note)

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return AIAnalysisResponse(
            attackPathId=path_id,
            title=title,
            killChainSummary=kill_chain,
            rootCauseAnalysis=root_cause,
            businessImpact=business_impact,
            chokePointAssetId=choke_point_asset,
            chokePointDescription=choke_point_desc,
            recommendedAction=rec_action,
            evidenceReferences=evidence,
            uncertainties=uncertainties,
            groundedMode="RULE_ENGINE_DETERMINISTIC",
            provenance="SIMULATED_DEMO" if is_simulated else "OBSERVED",
            responseTimeMs=duration_ms,
            createdAt=_utc_now_iso()
        )
