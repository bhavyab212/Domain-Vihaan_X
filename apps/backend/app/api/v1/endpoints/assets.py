# apps/backend/app/api/v1/endpoints/assets.py
"""Asset management endpoints conforming to docs/02-architecture/API_CONTRACT.md."""

from typing import List
from fastapi import APIRouter, HTTPException
from app.schemas.asset import AssetResponse, AssetCreateRequest

router = APIRouter()


@router.get("", response_model=List[AssetResponse], summary="List all registered digital assets")
async def list_assets():
    """Returns list of registered digital assets."""
    # Scaffold placeholder: In demo mode, loads from DemoProvider; in live mode, from DB repository
    return []


@router.post("", response_model=AssetResponse, status_code=201, summary="Register a new digital asset")
async def create_asset(payload: AssetCreateRequest):
    """Register a new digital asset for security scanning."""
    # Scaffold placeholder
    raise HTTPException(status_code=501, detail="Asset creation logic pending full implementation")
