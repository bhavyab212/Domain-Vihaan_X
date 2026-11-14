# apps/backend/app/api/v1/endpoints/graph.py
"""Business Security Graph query and visualization endpoint."""

from fastapi import APIRouter
from app.schemas.attack_path import SecurityGraphResponse

router = APIRouter()


@router.get("", response_model=SecurityGraphResponse, summary="Get full Business Security Graph")
async def get_security_graph():
    """Returns nodes and edges representing assets, findings, and attack relationships."""
    # Scaffold placeholder
    return SecurityGraphResponse(
        nodes=[],
        edges=[],
        updatedAt="2026-11-15T00:00:00Z"
    )
