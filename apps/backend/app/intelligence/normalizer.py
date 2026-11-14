# apps/backend/app/intelligence/normalizer.py
"""
Transforms raw heterogeneous scanner outputs (Gitleaks, Checkov, Trivy, Subfinder)
into canonical FindingResponse objects conforming to contracts/schemas/finding.schema.json.
"""

from typing import List, Dict, Any
from app.schemas.finding import FindingResponse
from app.integrations.scanners.base import RawScannerResult


class FindingNormalizer:
    @staticmethod
    def normalize_gitleaks(raw_items: List[Dict[str, Any]], asset_id: str) -> List[FindingResponse]:
        findings: List[FindingResponse] = []
        for idx, item in enumerate(raw_items):
            findings.append(
                FindingResponse(
                    id=f"gitleaks-{asset_id}-{idx}",
                    title=f"Secret Detected: {item.get('Description', 'Hardcoded Secret')}",
                    description=f"Potential credential leak found in file {item.get('File', '')}",
                    severity="CRITICAL",
                    scanner="gitleaks",
                    assetId=asset_id,
                    provenance="OBSERVED",
                    location={
                        "file": item.get("File"),
                        "line": item.get("StartLine")
                    },
                    status="OPEN",
                    discoveredAt="2026-11-15T00:00:00Z"
                )
            )
        return findings
