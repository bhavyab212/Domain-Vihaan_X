# apps/backend/app/api/v1/endpoints/ai.py
"""
AI Security Analyst REST endpoints.
Provides evidence-grounded attack path analysis and deterministic rule fallbacks (TSK-015).
"""

import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.entities import AttackPathModel
from app.schemas.ai import AIAnalysisResponse
from app.ai.analyzer import AISecurityAnalyst

router = APIRouter()
analyst = AISecurityAnalyst()


@router.post(
    "/analyze/{path_id}",
    response_model=AIAnalysisResponse,
    summary="Generate grounded AI analysis for an attack path",
    response_description="Returns structured kill chain analysis, choke-point detection, and evidence tracing."
)
async def analyze_attack_path(path_id: str, db: Session = Depends(get_db)):
    """
    Analyzes an attack path using evidence grounding and anti-hallucination controls.
    Degrades seamlessly to sub-50ms deterministic rule engine when offline or if LLM times out.
    """
    path_record = db.query(AttackPathModel).filter(AttackPathModel.id == path_id).first()
    if not path_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attack path '{path_id}' not found."
        )

    try:
        steps_data = json.loads(path_record.steps_json) if path_record.steps_json else []
    except Exception:
        steps_data = []

    path_data = {
        "id": path_record.id,
        "title": path_record.title,
        "summary": path_record.summary,
        "severity": path_record.severity,
        "confidenceScore": path_record.confidence_score,
        "isSimulated": path_record.is_simulated,
        "entryPointAssetId": path_record.entry_point_asset_id,
        "crownJewelAssetId": path_record.crown_jewel_asset_id,
        "steps": steps_data,
        "status": path_record.status,
    }

    result = await analyst.analyze_attack_path(path_data)
    return result
