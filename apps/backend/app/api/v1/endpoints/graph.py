# apps/backend/app/api/v1/endpoints/graph.py
"""
Business Security Graph query and visualization endpoint.
Connects the NetworkX intelligence graph model directly to the SQLite database.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.attack_path import SecurityGraphResponse
from app.intelligence.asset_graph import AssetSecurityGraph

router = APIRouter()


@router.get("", response_model=SecurityGraphResponse, summary="Get full Business Security Graph")
def get_security_graph(
    include_findings: bool = Query(
        False,
        description="Whether to project individual findings as discrete graph nodes"
    ),
    db: Session = Depends(get_db)
) -> SecurityGraphResponse:
    """
    Returns nodes and edges representing business assets and their directed trust relationships.
    Built deterministically from the database state via NetworkX.
    """
    graph = AssetSecurityGraph.build_from_database(db, include_finding_nodes=include_findings)
    return graph.to_schema()
