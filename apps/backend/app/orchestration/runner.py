# apps/backend/app/orchestration/runner.py
"""
Orchestrates multi-scanner execution with timeout enforcement,
partial-result resilience, normalization, and risk evaluation.
"""

import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.integrations.scanners.base import BaseScannerAdapter, RawScannerResult
from app.intelligence.normalizer import FindingNormalizer, NormalizationResult
from app.intelligence.risk_engine import ContextualRiskEngine, AssetContext, ContextualRiskResult
from app.schemas.finding import FindingResponse

logger = logging.getLogger(__name__)


class AssessmentReport(BaseModel):
    target: str
    asset_id: str
    status: str  # "completed", "partial", "failed"
    raw_results: List[RawScannerResult] = Field(default_factory=list)
    normalized_findings: List[FindingResponse] = Field(default_factory=list)
    quarantined_count: int = 0
    asset_risk_score: float = 0.0
    asset_risk_level: str = "LOW"
    scanner_telemetry: Dict[str, Dict[str, Any]] = Field(default_factory=dict)


class AssessmentRunner:
    """
    Coordinates execution across configured scanner adapters.
    Tolerates individual scanner timeouts and failures without aborting the pipeline.
    """

    def __init__(self, adapters: Optional[List[BaseScannerAdapter]] = None):
        self.adapters = adapters or []

    async def run_assessment(
        self,
        target: str,
        asset_id: str = "asset-default",
        asset_context: Optional[AssetContext] = None
    ) -> AssessmentReport:
        """
        Executes all configured scanners against target.
        Normalizes outputs and evaluates contextual risk.
        """
        raw_results: List[RawScannerResult] = []
        scanner_telemetry: Dict[str, Dict[str, Any]] = {}
        all_findings: List[FindingResponse] = []
        total_quarantined = 0
        failed_count = 0

        for adapter in self.adapters:
            name = adapter.scanner_name
            logger.info("Executing scanner adapter: %s on target '%s'", name, target)
            try:
                res = await adapter.execute_scan(target)
                raw_results.append(res)

                # Track telemetry
                status_label = "COMPLETED"
                if res.exit_code == 124:
                    status_label = "TIMED_OUT"
                    failed_count += 1
                elif res.exit_code != 0:
                    status_label = "FAILED"
                    failed_count += 1

                scanner_telemetry[name] = {
                    "exit_code": res.exit_code,
                    "execution_time_seconds": res.execution_time_seconds,
                    "status": status_label,
                    "raw_items_count": len(res.parsed_items),
                }

                # Normalize findings
                norm_res: NormalizationResult = FindingNormalizer.normalize(
                    scanner=name,
                    raw_data=res.parsed_items,
                    asset_id=asset_id,
                    provenance="SIMULATED_DEMO" if "DEMO_MODE" in res.raw_stderr else "OBSERVED"
                )
                all_findings.extend(norm_res.findings)
                total_quarantined += len(norm_res.quarantined)

            except Exception as e:
                logger.error("Unhandled exception executing scanner %s: %s", name, e, exc_info=True)
                failed_count += 1
                scanner_telemetry[name] = {
                    "exit_code": 1,
                    "execution_time_seconds": 0.0,
                    "status": "ERROR",
                    "error": str(e),
                }

        # Determine overall pipeline status
        if not self.adapters:
            overall_status = "completed"
        elif failed_count == 0:
            overall_status = "completed"
        elif failed_count < len(self.adapters):
            overall_status = "partial"
        else:
            overall_status = "failed"

        # Compute asset contextual risk rollup
        ctx = asset_context or AssetContext(
            asset_id=asset_id,
            criticality="HIGH",
            is_exposed=True
        )
        risk_res = ContextualRiskEngine.calculate_composite_asset_risk(asset=ctx, findings=all_findings)

        return AssessmentReport(
            target=target,
            asset_id=asset_id,
            status=overall_status,
            raw_results=raw_results,
            normalized_findings=all_findings,
            quarantined_count=total_quarantined,
            asset_risk_score=risk_res.score,
            asset_risk_level=risk_res.severityBand,
            scanner_telemetry=scanner_telemetry
        )
