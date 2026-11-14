# apps/backend/app/api/v1/endpoints/remediations.py
"""Human-in-the-loop Remediation endpoints conforming to AGENTS.md safety protocols."""

from typing import List
from fastapi import APIRouter, HTTPException
from app.schemas.remediation import RemediationResponse, RemediationApproveRequest

router = APIRouter()


@router.get("", response_model=List[RemediationResponse], summary="List proposed remediations")
async def list_remediations():
    """Returns proposed remediation actions requiring human review."""
    return []


@router.post("/{remediation_id}/approve", response_model=RemediationResponse, summary="Approve and apply remediation")
async def approve_remediation(remediation_id: str, payload: RemediationApproveRequest):
    """
    Explicit human approval gate required before remediation is executed or committed.
    Strictly governed by AGENTS.md Section 3.
    """
    # Scaffold placeholder
    raise HTTPException(status_code=501, detail="Remediation execution pipeline pending verification engine")
