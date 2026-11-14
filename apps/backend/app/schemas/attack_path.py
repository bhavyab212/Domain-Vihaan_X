# apps/backend/app/schemas/attack_path.py
"""Graph and Attack Path schemas matching contracts/schemas/."""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

NodeType = Literal["ASSET", "FINDING", "IDENTITY", "EXPLOIT_TARGET"]
EdgeType = Literal["STORES_CREDENTIAL_FOR", "GRANTS_ACCESS_TO", "DEPENDS_ON", "EXPOSES", "CAN_PIVOT_TO"]
SeverityType = Literal["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]


class GraphNode(BaseModel):
    id: str
    label: str
    type: NodeType
    severity: Optional[SeverityType] = None
    data: Dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relationship: EdgeType
    inferred: bool = False
    confidence: Optional[float] = None


class SecurityGraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    updatedAt: str


class AttackPathStep(BaseModel):
    stepNumber: int
    assetId: str
    findingId: Optional[str] = None
    description: str
    technique: str
    mitreTactic: Optional[str] = None


class AttackPathResponse(BaseModel):
    id: str
    title: str
    summary: str
    severity: SeverityType
    confidenceScore: float
    isSimulated: bool
    entryPointAssetId: str
    crownJewelAssetId: str
    steps: List[AttackPathStep]
    status: Literal["ACTIVE", "MITIGATED"] = "ACTIVE"
    createdAt: str
