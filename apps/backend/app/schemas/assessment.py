# apps/backend/app/schemas/assessment.py
"""Assessment run triggers and status polling schemas."""

from typing import Optional, Literal
from pydantic import BaseModel

OperatingMode = Literal["DEMO_MODE", "LIVE_ASSESSMENT_MODE"]
AssessmentStatus = Literal["idle", "running", "completed", "failed", "cancelled"]


class AssessmentTriggerRequest(BaseModel):
    mode: OperatingMode = "DEMO_MODE"
    targetId: Optional[str] = None


class AssessmentStatusResponse(BaseModel):
    id: str
    mode: OperatingMode
    status: AssessmentStatus
    progressPercent: int
    currentStepMessage: str
    totalAssets: int
    scannedAssets: int
    findingsCount: int
    criticalCount: int
    highCount: int
    mediumCount: int
    lowCount: int
    startedAt: str
    completedAt: Optional[str] = None
