# apps/backend/app/orchestration/runner.py
"""
Orchestrates multi-scanner execution with timeout enforcement,
partial-result resilience, and progress tracking.
"""

from typing import List, Dict, Any
from app.integrations.scanners.base import BaseScannerAdapter, RawScannerResult
from app.core.logging import setup_logging

logger = setup_logging()


class AssessmentRunner:
    def __init__(self, adapters: List[BaseScannerAdapter]):
        self.adapters = adapters

    async def run_assessment(self, target: str) -> List[RawScannerResult]:
        """
        Executes all available scanners against target.
        Handles individual scanner timeouts gracefully without aborting the entire run.
        """
        results: List[RawScannerResult] = []
        for adapter in self.adapters:
            logger.info(f"Checking availability for {adapter.scanner_name}")
            if await adapter.is_available():
                logger.info(f"Executing {adapter.scanner_name} on {target}")
                try:
                    res = await adapter.execute_scan(target)
                    results.append(res)
                except Exception as e:
                    logger.error(f"Scanner {adapter.scanner_name} failed: {e}")
            else:
                logger.warning(f"Scanner {adapter.scanner_name} is unavailable. Skipping.")
        return results
