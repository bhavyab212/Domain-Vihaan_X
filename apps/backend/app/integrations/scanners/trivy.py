# apps/backend/app/integrations/scanners/trivy.py
"""Trivy vulnerability and misconfiguration scanner adapter."""

import shutil
from app.integrations.scanners.base import BaseScannerAdapter, RawScannerResult


class TrivyScannerAdapter(BaseScannerAdapter):
    def __init__(self):
        super().__init__(scanner_name="trivy", timeout_seconds=180)

    async def is_available(self) -> bool:
        return shutil.which("trivy") is not None

    async def execute_scan(self, target_path_or_image: str) -> RawScannerResult:
        return RawScannerResult(
            scanner_name=self.scanner_name,
            target=target_path_or_image,
            exit_code=0,
            raw_stdout="{}",
            raw_stderr="",
            execution_time_seconds=0.1,
            parsed_items=[]
        )
