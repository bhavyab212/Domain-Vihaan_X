# apps/backend/app/api/v1/endpoints/assessments.py
"""Security assessment execution and polling endpoints."""

from fastapi import APIRouter, HTTPException
from app.schemas.assessment import AssessmentTriggerRequest, AssessmentStatusResponse

router = APIRouter()


@router.post("/trigger", response_model=AssessmentStatusResponse, summary="Trigger a security assessment")
async def trigger_assessment(payload: AssessmentTriggerRequest):
    """Triggers an assessment run (either DEMO_MODE or LIVE_ASSESSMENT_MODE)."""
    # Scaffold placeholder
    return AssessmentStatusResponse(
        id="run-init-01",
        mode=payload.mode,
        status="running",
        progressPercent=10,
        currentStepMessage="Initializing scanner runners and safety verification...",
        totalAssets=1,
        scannedAssets=0,
        findingsCount=0,
        criticalCount=0,
        highCount=0,
        mediumCount=0,
        lowCount=0,
        startedAt="2026-11-15T00:00:00Z"
    )


@router.get("/{assessment_id}/status", response_model=AssessmentStatusResponse, summary="Poll assessment status")
async def get_assessment_status(assessment_id: str):
    """Returns the live status of an ongoing or completed assessment."""
    # Scaffold placeholder
    raise HTTPException(status_code=501, detail="Assessment status polling pending runner integration")
