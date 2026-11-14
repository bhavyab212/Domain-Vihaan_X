# apps/backend/app/integrations/scanners/gitleaks.py
"""Gitleaks secret scanner adapter."""

import shutil
from app.integrations.scanners.base import BaseScannerAdapter, RawScannerResult


class GitleaksScannerAdapter(BaseScannerAdapter):
    def __init__(self):
        super().__init__(scanner_name="gitleaks", timeout_seconds=60)

    async def is_available(self) -> bool:
        return shutil.which("gitleaks") is not None

    async def execute_scan(self, target_path: str) -> RawScannerResult:
        # Placeholder for sandboxed execution
        return RawScannerResult(
            scanner_name=self.scanner_name,
            target=target_path,
            exit_code=0,
            raw_stdout="[]",
            raw_stderr="",
            execution_time_seconds=0.1,
            parsed_items=[]
        )
