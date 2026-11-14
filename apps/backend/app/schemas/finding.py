# apps/backend/app/schemas/finding.py
"""Finding schemas matching contracts/schemas/finding.schema.json."""

from typing import Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

SeverityType = Literal["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]
ProvenanceType = Literal["OBSERVED", "INFERRED", "SIMULATED"]
FindingStatus = Literal["OPEN", "IN_REMEDIATION", "RESOLVED", "ACCEPTED_RISK"]


class LocationInfo(BaseModel):
    file: Optional[str] = None
    line: Optional[int] = None
    resource: Optional[str] = None


class FindingResponse(BaseModel):
    id: str
    title: str
    description: str
    severity: SeverityType
    scanner: str
    assetId: str
    cveId: Optional[str] = None
    cvssScore: Optional[float] = None
    provenance: ProvenanceType
    location: Optional[LocationInfo] = None
    remediationGuidance: Optional[str] = None
    status: FindingStatus = "OPEN"
    discoveredAt: str
