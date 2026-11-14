# apps/backend/app/api/v1/endpoints/findings.py
"""Security findings query endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Query
from app.schemas.finding import FindingResponse

router = APIRouter()


@router.get("", response_model=List[FindingResponse], summary="List normalized security findings")
async def list_findings(
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    asset_id: Optional[str] = Query(None, description="Filter by associated asset ID")
):
    """Returns normalized security findings discovered during scans or demo runs."""
    # Scaffold placeholder
    return []
