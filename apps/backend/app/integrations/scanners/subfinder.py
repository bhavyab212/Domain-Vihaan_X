# apps/backend/app/integrations/scanners/subfinder.py
"""
Subfinder Subdomain Enumeration Scanner Adapter.
Executes passive subdomain discovery with strict target domain allowlist verification,
subdomain scope confinement, parameterized subprocess execution (shell=False),
and offline DEMO_MODE resilience.
"""

import asyncio
import json
import logging
import os
import shutil
import subprocess
import time
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.integrations.scanners.base import BaseScannerAdapter, RawScannerResult
from app.core.config import settings
from app.core.safety import validate_target_domain, SecurityBoundaryError

logger = logging.getLogger(__name__)


class SubfinderScannerAdapter(BaseScannerAdapter):
    """
    Adapter for ProjectDiscovery Subfinder CLI scanner.
    """

    def __init__(self, timeout_seconds: int = 45):
        super().__init__(scanner_name="subfinder", timeout_seconds=timeout_seconds)

    async def is_available(self) -> bool:
        """Checks if the subfinder binary is present on PATH."""
        return shutil.which("subfinder") is not None

    def validate_target(self, target: str) -> bool:
        """
        Validates target against authorized domain allowlist in safety policy.
        """
        return validate_target_domain(target)

    def filter_scope_confinement(
        self, entries: List[Dict[str, Any]], root_domain: str
    ) -> List[Dict[str, Any]]:
        """
        Filters out discovered hostnames that do not belong to the authorized root domain.
        Prevents third-party out-of-scope asset drift.
        """
        clean_root = root_domain.strip().lower()
        confined: List[Dict[str, Any]] = []

        for entry in entries:
            host = entry.get("host", "").strip().lower()
            if not host:
                continue
            if host == clean_root or host.endswith("." + clean_root):
                confined.append(entry)
            else:
                logger.warning(
                    "Scope confinement filtered out-of-scope domain '%s' (authorized root: '%s')",
                    host,
                    clean_root
                )
        return confined

    def _load_synthetic_demo_findings(self, target: str) -> List[Dict[str, Any]]:
        """Loads certified synthetic demonstration findings when offline in DEMO_MODE."""
        fixture_path = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "subfinder_output.json"
        if fixture_path.exists():
            try:
                with open(fixture_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        return data
                    elif isinstance(data, dict):
                        return [data]
            except Exception as e:
                logger.error("Failed to load synthetic subfinder fixture: %s", e)

        # Fallback inline synthetic entries
        return [
            {
                "host": f"staging-api.{target}",
                "ip": "54.214.12.99",
                "source": "censys"
            },
            {
                "host": f"admin-portal.{target}",
                "ip": "54.214.12.105",
                "source": "virustotal"
            }
        ]

    async def execute_scan(self, target: str) -> RawScannerResult:
        """
        Executes subfinder subdomain discovery with scope validation and safe subprocess execution.
        """
        self.validate_target(target)
        is_avail = await self.is_available()

        if not is_avail:
            in_demo_mode = (getattr(settings, "DEFAULT_OPERATING_MODE", "DEMO_MODE") == "DEMO_MODE")
            if in_demo_mode:
                synthetic_findings = self._load_synthetic_demo_findings(target)
                raw_json = json.dumps(synthetic_findings, indent=2)
                return RawScannerResult(
                    scanner_name=self.scanner_name,
                    target=target,
                    exit_code=0,
                    raw_stdout=raw_json,
                    raw_stderr=(
                        "[DEMO_MODE] Subfinder binary not found on PATH; "
                        "loaded certified synthetic demonstration fixtures."
                    ),
                    execution_time_seconds=0.05,
                    parsed_items=synthetic_findings,
                )
            else:
                return RawScannerResult(
                    scanner_name=self.scanner_name,
                    target=target,
                    exit_code=127,
                    raw_stdout="",
                    raw_stderr="Subfinder binary not found on PATH. Install subfinder to run live subdomain enumeration.",
                    execution_time_seconds=0.0,
                    parsed_items=[],
                )

        # Parameterized command execution with shell=False
        cmd = [
            "subfinder",
            "-d",
            target.strip(),
            "-silent",
            "-json"
        ]

        start_time = time.time()
        try:
            proc = await asyncio.to_thread(
                subprocess.run,
                cmd,
                capture_output=True,
                text=True,
                timeout=self.timeout_seconds,
                shell=False
            )
            duration = round(time.time() - start_time, 2)

            parsed_entries: List[Dict[str, Any]] = []
            for line in proc.stdout.splitlines():
                clean_line = line.strip()
                if not clean_line:
                    continue
                try:
                    obj = json.loads(clean_line)
                    if isinstance(obj, dict):
                        parsed_entries.append(obj)
                    elif isinstance(obj, str):
                        parsed_entries.append({"host": obj})
                except json.JSONDecodeError:
                    parsed_entries.append({"host": clean_line})

            confined_entries = self.filter_scope_confinement(parsed_entries, target)

            return RawScannerResult(
                scanner_name=self.scanner_name,
                target=target,
                exit_code=proc.returncode,
                raw_stdout=proc.stdout,
                raw_stderr=proc.stderr,
                execution_time_seconds=duration,
                parsed_items=confined_entries,
            )

        except subprocess.TimeoutExpired:
            duration = round(time.time() - start_time, 2)
            logger.warning("Subfinder execution timed out after %ds on target '%s'", self.timeout_seconds, target)
            return RawScannerResult(
                scanner_name=self.scanner_name,
                target=target,
                exit_code=124,
                raw_stdout="",
                raw_stderr=f"Subfinder execution timed out after {self.timeout_seconds} seconds.",
                execution_time_seconds=duration,
                parsed_items=[],
            )
        except Exception as e:
            logger.error("Subfinder execution failure: %s", e)
            return RawScannerResult(
                scanner_name=self.scanner_name,
                target=target,
                exit_code=1,
                raw_stdout="",
                raw_stderr=f"Subfinder execution error: {str(e)}",
                execution_time_seconds=0.0,
                parsed_items=[],
            )
