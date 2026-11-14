# apps/backend/app/services/asset_service.py
"""Asset domain service."""

from typing import List
from app.schemas.asset import AssetResponse, AssetCreateRequest


class AssetService:
    def __init__(self):
        pass

    async def list_assets(self) -> List[AssetResponse]:
        """Placeholder for listing assets."""
        return []

    async def register_asset(self, payload: AssetCreateRequest) -> AssetResponse:
        """Placeholder for registering an asset."""
        raise NotImplementedError("AssetService.register_asset pending implementation")
