# apps/backend/app/api/v1/endpoints/health.py
"""
Health check and subsystem status endpoint.
Conforms to contracts/openapi/openapi.yaml HealthResponse schema.
"""

import shutil
from typing import Dict, Any
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


def check_scanner_statuses() -> Dict[str, str]:
    """
    Honest, non-fabricated detection of scanner tooling status on host.
    Checks PATH availability for local CLIs and configuration state for external adapters.
    Never claims a scanner is healthy or ready unless verified.
    """
    scanners: Dict[str, str] = {}

    # Check CLI tool binaries
    for tool in ["gitleaks", "checkov", "trivy", "subfinder"]:
        if shutil.which(tool) is not None:
            scanners[tool] = "ready"
        else:
            scanners[tool] = "unverified"

    # HexStrike external adapter state
    if settings.HEXSTRIKE_MCP_URL:
        scanners["hexstrike"] = "configured"
    else:
        scanners["hexstrike"] = "optional-unconfigured"

    return scanners


@router.get(
    "/health",
    tags=["System"],
    summary="System Health and Subsystem Status",
    response_description="Returns system status, active operating mode, and honest scanner readiness."
)
async def get_health() -> Dict[str, Any]:
    """
    Return system health status and active operating mode.
    Conforms strictly to components/schemas/HealthResponse in contracts/openapi/openapi.yaml.
    """
    return {
        "status": "healthy",
        "mode": settings.DEFAULT_OPERATING_MODE,
        "scanners": check_scanner_statuses()
    }
