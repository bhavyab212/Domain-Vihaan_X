# apps/backend/app/api/v1/endpoints/health.py
"""Health check and subsystem status endpoint."""

from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/health", tags=["System"])
async def get_health():
    """Return system health status and active operating mode."""
    return {
        "status": "healthy",
        "mode": settings.DEFAULT_OPERATING_MODE,
        "scanners": {
            "gitleaks": "ready",
            "checkov": "ready",
            "trivy": "ready",
            "hexstrike": "optional-unconnected"
        }
    }
