# apps/backend/app/schemas/remediation.py
"""Remediation schemas matching contracts/schemas/remediation.schema.json."""

from typing import Optional, Literal
from pydantic import BaseModel

RemediationStatus = Literal["PENDING", "APPROVED", "APPLIED", "FAILED", "REJECTED"]
VerificationStatus = Literal["UNVERIFIED", "PASSED", "FAILED"]


class RemediationResponse(BaseModel):
    id: str
    findingId: str
    attackPathId: Optional[str] = None
    title: str
    description: str
    patchDiff: Optional[str] = None
    shellScript: Optional[str] = None
    requiresApproval: bool = True
    status: RemediationStatus = "PENDING"
    verificationStatus: Optional[VerificationStatus] = "UNVERIFIED"
    createdAt: str


class RemediationApproveRequest(BaseModel):
    approvedBy: str
    comments: Optional[str] = None
