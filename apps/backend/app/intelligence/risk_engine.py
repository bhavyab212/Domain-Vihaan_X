# apps/backend/app/intelligence/risk_engine.py
"""
Contextual risk scoring engine.
Calculates business risk based on asset criticality, finding severity, and exposure path reachable.
"""

from typing import List
from app.schemas.finding import FindingResponse


class RiskEngine:
    SEVERITY_WEIGHTS = {
        "CRITICAL": 10.0,
        "HIGH": 7.5,
        "MEDIUM": 4.0,
        "LOW": 1.5,
        "INFORMATIONAL": 0.2
    }

    @classmethod
    def calculate_composite_score(cls, findings: List[FindingResponse]) -> float:
        """Calculates normalized 0-100 business risk score."""
        if not findings:
            return 0.0
        raw_sum = sum(cls.SEVERITY_WEIGHTS.get(f.severity, 0.0) for f in findings)
        return min(100.0, raw_sum * 2.5)
