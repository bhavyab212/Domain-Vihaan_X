# apps/backend/app/schemas/asset.py
"""Asset schemas matching contracts/schemas/asset.schema.json."""

from typing import Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


AssetType = Literal["REPOSITORY", "CLOUD_ACCOUNT", "DOMAIN", "WEB_APPLICATION", "API_ENDPOINT", "DATABASE"]
EnvironmentType = Literal["PRODUCTION", "STAGING", "DEVELOPMENT"]
CriticalityType = Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]


class AssetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    type: AssetType
    environment: EnvironmentType = "PRODUCTION"
    criticality: CriticalityType = "MEDIUM"
    owner: str = Field(..., max_length=100)
    metadata: Optional[Dict[str, Any]] = None


class AssetCreateRequest(AssetBase):
    pass


class AssetResponse(AssetBase):
    id: str
    createdAt: str
    updatedAt: str
