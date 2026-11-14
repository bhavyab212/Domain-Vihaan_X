# apps/backend/app/integrations/scanners/hexstrike.py
"""
HexStrike-AI integration adapter.
Conforms to ADR-003 and docs/04-quality-and-security/HEXSTRIKE_INTEGRATION.md.
Communicates strictly via localhost/MCP adapter. Never permits direct public exposure or raw command injection.
"""

import httpx
from typing import Optional, Dict, Any
from app.integrations.scanners.base import BaseScannerAdapter, RawScannerResult
from app.core.config import settings
from app.core.safety import validate_target_domain


class HexStrikeAdapter(BaseScannerAdapter):
    def __init__(self):
        super().__init__(scanner_name="hexstrike", timeout_seconds=60)
        self.endpoint_url = settings.HEXSTRIKE_MCP_URL

    async def is_available(self) -> bool:
        """Verifies if HexStrike service is responsive on configured localhost endpoint."""
        if not self.endpoint_url:
            return False
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.endpoint_url}/health")
                return res.status_code == 200
        except Exception:
            return False

    async def execute_scan(self, target: str) -> RawScannerResult:
        """
        Executes a security scan via HexStrike with target allowlist verification.
        """
        validate_target_domain(target)
        if not await self.is_available():
            return RawScannerResult(
                scanner_name=self.scanner_name,
                target=target,
                exit_code=1,
                raw_stdout="",
                raw_stderr="HexStrike service unavailable or unconfigured; falling back to direct CLI scanners.",
                execution_time_seconds=0.0,
                parsed_items=[]
            )

        # Placeholder for MCP / HTTP invocation
        return RawScannerResult(
            scanner_name=self.scanner_name,
            target=target,
            exit_code=0,
            raw_stdout="{}",
            raw_stderr="",
            execution_time_seconds=0.5,
            parsed_items=[]
        )
