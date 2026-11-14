# apps/backend/app/api/v1/router.py
"""Central router aggregating all V1 endpoints."""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    assets,
    assessments,
    findings,
    graph,
    attack_paths,
    remediations,
    demo
)

api_v1_router = APIRouter()

api_v1_router.include_router(health.router, tags=["System"])
api_v1_router.include_router(assets.router, prefix="/assets", tags=["Assets"])
api_v1_router.include_router(assessments.router, prefix="/assessments", tags=["Assessments"])
api_v1_router.include_router(findings.router, prefix="/findings", tags=["Findings"])
api_v1_router.include_router(graph.router, prefix="/graph", tags=["Graph"])
api_v1_router.include_router(attack_paths.router, prefix="/attack-paths", tags=["AttackPaths"])
api_v1_router.include_router(remediations.router, prefix="/remediations", tags=["Remediations"])
api_v1_router.include_router(demo.router, prefix="/demo", tags=["Demo"])
