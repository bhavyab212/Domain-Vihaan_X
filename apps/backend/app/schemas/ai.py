# apps/backend/app/schemas/ai.py
"""
Pydantic V2 schemas for Grounded AI Analysis and Deterministic Explanations (TSK-015).
Enforces zero hallucination, strict evidence referencing, and latency tracking.
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field

GroundedMode = Literal["RULE_ENGINE_DETERMINISTIC", "LLM_GROUNDED"]
Provenance = Literal["OBSERVED", "SIMULATED_DEMO"]


class EvidenceReference(BaseModel):
    id: str = Field(..., description="Unique identifier of the grounded finding, asset, or relationship")
    type: Literal["FINDING", "ASSET", "RELATIONSHIP", "SCANNER_RESULT"]
    description: str = Field(..., description="Contextual explanation of how this evidence supports the finding")


class AIAnalysisResponse(BaseModel):
    attackPathId: str = Field(..., description="Identifier of the analyzed attack path")
    title: str = Field(..., description="Human-readable title of the attack scenario")
    killChainSummary: str = Field(..., description="Executive narrative of the step-by-step traversal")
    rootCauseAnalysis: str = Field(..., description="Underlying security vulnerability or misconfiguration initiating the chain")
    businessImpact: str = Field(..., description="Quantified or qualitative operational and data compromise consequences")
    chokePointAssetId: str = Field(..., description="Optimal single asset or finding where remediation completely severs the attack path")
    chokePointDescription: str = Field(..., description="Explanation of why this choke point is the most effective mitigation")
    recommendedAction: str = Field(..., description="Prescriptive guidance for engineering remediation")
    evidenceReferences: List[EvidenceReference] = Field(default_factory=list, description="Explicit trace of all supporting facts")
    uncertainties: List[str] = Field(default_factory=list, description="Disclaimers regarding unverified relationships or heuristic inference")
    groundedMode: GroundedMode = Field(..., description="Whether generated via deterministic rules or grounded LLM")
    provenance: Provenance = Field(default="OBSERVED", description="Data provenance label")
    responseTimeMs: float = Field(..., description="Processing duration in milliseconds")
    createdAt: str = Field(..., description="ISO 8601 timestamp")
