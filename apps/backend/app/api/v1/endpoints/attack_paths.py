# apps/backend/app/api/v1/endpoints/attack_paths.py
"""
Attack Path intelligence endpoints.
Provides query and discovery capabilities for multi-hop attack paths.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.entities import AttackPathModel, FindingModel
from app.schemas.attack_path import AttackPathResponse
from app.intelligence.asset_graph import AssetSecurityGraph
from app.intelligence.attack_path import AttackPathEngine, attack_path_model_to_response

router = APIRouter()


@router.get("", response_model=List[AttackPathResponse], summary="List or discover attack paths")
def list_attack_paths(
    severity: Optional[str] = Query(None, description="Filter by severity: CRITICAL, HIGH, MEDIUM, LOW"),
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE, MITIGATED"),
    discover: bool = Query(False, description="Run live bounded DFS discovery across current graph"),
    db: Session = Depends(get_db)
) -> List[AttackPathResponse]:
    """
    Returns identified multi-hop attack paths traversing the Business Security Graph.
    If 'discover=true' or no persisted paths exist, runs graph DFS analysis dynamically.
    """
    if discover:
        graph = AssetSecurityGraph.build_from_database(db, include_finding_nodes=False)
        findings = db.query(FindingModel).all()
        findings_map = {}
        for f in findings:
            findings_map.setdefault(f.asset_id, []).append(f)
        engine = AttackPathEngine(graph.graph)
        discovered = engine.discover_attack_paths(db_findings_map=findings_map)

        if severity:
            discovered = [p for p in discovered if p.severity == severity.upper()]
        if status:
            discovered = [p for p in discovered if p.status == status.upper()]
        return discovered

    # Default: query persisted attack paths from database
    query = db.query(AttackPathModel)
    if severity:
        query = query.filter(AttackPathModel.severity == severity.upper())
    if status:
        query = query.filter(AttackPathModel.status == status.upper())

    persisted = query.all()
    if persisted:
        return [attack_path_model_to_response(m) for m in persisted]

    # Fallback to dynamic discovery if no persisted paths exist in DB
    graph = AssetSecurityGraph.build_from_database(db, include_finding_nodes=False)
    findings = db.query(FindingModel).all()
    findings_map = {}
    for f in findings:
        findings_map.setdefault(f.asset_id, []).append(f)
    engine = AttackPathEngine(graph.graph)
    discovered = engine.discover_attack_paths(db_findings_map=findings_map)
    if severity:
        discovered = [p for p in discovered if p.severity == severity.upper()]
    if status:
        discovered = [p for p in discovered if p.status == status.upper()]
    return discovered
