# apps/backend/app/integrations/scanners/checkov.py
"""Checkov Infrastructure-as-Code (IaC) scanner adapter."""

import shutil
from app.integrations.scanners.base import BaseScannerAdapter, RawScannerResult


class CheckovScannerAdapter(BaseScannerAdapter):
    def __init__(self):
        super().__init__(scanner_name="checkov", timeout_seconds=120)

    async def is_available(self) -> bool:
        return shutil.which("checkov") is not None

    async def execute_scan(self, target_path: str) -> RawScannerResult:
        return RawScannerResult(
            scanner_name=self.scanner_name,
            target=target_path,
            exit_code=0,
            raw_stdout="{}",
            raw_stderr="",
            execution_time_seconds=0.1,
            parsed_items=[]
        )
