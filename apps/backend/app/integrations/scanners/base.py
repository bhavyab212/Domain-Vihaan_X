# apps/backend/app/integrations/scanners/base.py
"""
Base scanner adapter abstract interface.
Enforces safe execution parameters, timeout boundaries, and standardized finding extraction.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class RawScannerResult(BaseModel):
    scanner_name: str
    target: str
    exit_code: int
    raw_stdout: str
    raw_stderr: str
    execution_time_seconds: float
    parsed_items: List[Dict[str, Any]] = []


class BaseScannerAdapter(ABC):
    """Abstract base class for all CLI and external scanner adapters."""

    def __init__(self, scanner_name: str, timeout_seconds: int = 120):
        self.scanner_name = scanner_name
        self.timeout_seconds = timeout_seconds

    @abstractmethod
    async def is_available(self) -> bool:
        """Checks if scanner binary/tool is installed and reachable."""
        pass

    @abstractmethod
    async def execute_scan(self, target_path_or_domain: str) -> RawScannerResult:
        """Executes the tool in an isolated sandbox and returns normalized raw result."""
        pass
