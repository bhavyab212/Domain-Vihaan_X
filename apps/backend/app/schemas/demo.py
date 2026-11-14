# apps/backend/app/schemas/demo.py
"""
Pydantic V2 schemas for deterministic Demo Mode controls and scenario resets.
"""

from typing import Literal
from pydantic import BaseModel, Field


class DemoResetResponse(BaseModel):
    status: Literal["RESET_SUCCESSFUL", "RESET_FAILED"] = "RESET_SUCCESSFUL"
    scenarioId: str = Field(..., description="Canonical scenario identifier")
    mode: Literal["DEMO_MODE"] = "DEMO_MODE"
    message: str = Field(..., description="Human-readable outcome summary")
    assetsCount: int = Field(..., description="Number of demo assets seeded")
    findingsCount: int = Field(..., description="Number of demo findings seeded")
    relationshipsCount: int = Field(..., description="Number of demo relationships seeded")
    attackPathsCount: int = Field(..., description="Number of attack paths seeded")
    runtimeWorkspace: str = Field(..., description="Path to active synthetic runtime workspace")
    durationMs: float = Field(..., description="Total execution time in milliseconds")
    walVerified: bool = Field(..., description="Whether SQLite WAL mode is empirically verified")
    resetAt: str = Field(..., description="ISO 8601 timestamp of reset execution")
