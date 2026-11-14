# apps/backend/app/api/v1/endpoints/demo.py
"""
Demo mode control and deterministic scenario reset endpoints.
Enforces ADR-011 (Demo vs Live mode separation) and sub-second clean state recovery.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.demo import DemoResetResponse
from app.demo.provider import DemoScenarioProvider
from app.core.config import settings
from app.core.exceptions import DomainVihaanXException

router = APIRouter()


@router.post(
    "/reset",
    response_model=DemoResetResponse,
    status_code=status.HTTP_200_OK,
    summary="Reset demo scenario to initial state",
    response_description="Returns reset status, seeded entity counts, execution duration, and WAL status."
)
def reset_demo(db: Session = Depends(get_db)) -> DemoResetResponse:
    """
    Deterministically resets the platform state to the canonical synthetic demo baseline:
    1. Validates canonical scenario manifest in data/demo/scenario.json.
    2. Restores the synthetic runtime workspace (data/runtime/demo_workspace/mock_saas/).
    3. Scopes database clearing to demo records and transactionally reseeds assets, findings, and attack paths.
    4. Empirically verifies SQLite WAL mode.
    5. Returns execution telemetry in sub-second duration without external internet or LLM dependencies.
    """
    if settings.DEFAULT_OPERATING_MODE != "DEMO_MODE":
        raise DomainVihaanXException(
            "Demo reset operation is only permitted when running in DEMO_MODE.",
            status_code=status.HTTP_400_BAD_REQUEST
        )

    provider = DemoScenarioProvider()
    return provider.reset_demo(db)
