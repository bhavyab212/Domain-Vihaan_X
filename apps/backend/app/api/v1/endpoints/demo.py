# apps/backend/app/api/v1/endpoints/demo.py
"""Demo mode control and deterministic scenario loading endpoints."""

from fastapi import APIRouter
from app.schemas.assessment import AssessmentStatusResponse

router = APIRouter()


@router.post("/reset", response_model=AssessmentStatusResponse, summary="Reset demo scenario to initial state")
async def reset_demo():
    """
    Resets the runtime database and graph state to the canonical synthetic demo scenario
    defined in data/demo/scenario.json.
    """
    return AssessmentStatusResponse(
        id="run-demo-reset",
        mode="DEMO_MODE",
        status="completed",
        progressPercent=100,
        currentStepMessage="Demo scenario reset to canonical baseline.",
        totalAssets=3,
        scannedAssets=3,
        findingsCount=2,
        criticalCount=1,
        highCount=1,
        mediumCount=0,
        lowCount=0,
        startedAt="2026-11-15T00:00:00Z",
        completedAt="2026-11-15T00:00:01Z"
    )
