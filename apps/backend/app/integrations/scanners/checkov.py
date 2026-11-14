# apps/backend/app/integrations/scanners/checkov.py
"""
Checkov Infrastructure-as-Code (IaC) scanner CLI subprocess adapter.
Enforces parameterized execution (shell=False), target validation, mandatory timeout,
and offline DEMO_MODE fallback.
"""

import json
import time
import shutil
import asyncio
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.integrations.scanners.base import BaseScannerAdapter, RawScannerResult
from app.core.safety import validate_target_path, get_project_root
from app.core.config import settings


class CheckovScannerAdapter(BaseScannerAdapter):
    """
    Adapter for Checkov IaC security scanner.
    """

    def __init__(self, timeout_seconds: int = 120):
        super().__init__(scanner_name="checkov", timeout_seconds=timeout_seconds)

    async def is_available(self) -> bool:
        """Checks if checkov binary is present on system PATH."""
        return shutil.which("checkov") is not None

    async def execute_scan(self, target_path: str) -> RawScannerResult:
        """
        Executes checkov against target IaC directory.
        """
        start_time = time.perf_counter()

        # Step 1: Validate target path against security allowlist
        validated_target = validate_target_path(target_path)

        # Step 2: Check offline DEMO_MODE fallback or missing binary
        is_avail = await self.is_available()
        in_demo_mode = getattr(settings, "DEFAULT_OPERATING_MODE", "DEMO_MODE") == "DEMO_MODE"

        if not is_avail:
            duration = time.perf_counter() - start_time
            if in_demo_mode:
                fixtures_path = get_project_root() / "apps" / "backend" / "tests" / "fixtures" / "checkov_output.json"
                parsed_items = []
                if fixtures_path.exists():
                    try:
                        raw_data = json.loads(fixtures_path.read_text(encoding="utf-8"))
                        results = raw_data.get("results", {})
                        parsed_items = results.get("failed_checks", [])
                    except Exception:
                        parsed_items = []

                return RawScannerResult(
                    scanner_name=self.scanner_name,
                    target=str(validated_target),
                    exit_code=0,
                    raw_stdout="[DEMO_MODE] Synthetic Checkov IaC telemetry loaded successfully.",
                    raw_stderr="",
                    execution_time_seconds=round(duration, 3),
                    parsed_items=parsed_items
                )
            else:
                return RawScannerResult(
                    scanner_name=self.scanner_name,
                    target=str(validated_target),
                    exit_code=127,
                    raw_stdout="",
                    raw_stderr="checkov binary not found on system PATH in LIVE_ASSESSMENT_MODE.",
                    execution_time_seconds=round(duration, 3),
                    parsed_items=[]
                )

        # Step 3: Sandboxed CLI execution
        cmd = [
            "checkov",
            "-d",
            str(validated_target),
            "-o",
            "json",
            "--compact",
            "--quiet"
        ]

        def _run_subprocess():
            return subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                shell=False,
                timeout=self.timeout_seconds
            )

        try:
            proc = await asyncio.to_thread(_run_subprocess)
            exit_code = proc.returncode
            stdout = proc.stdout or ""
            stderr = proc.stderr or ""
            duration = time.perf_counter() - start_time

            parsed_items = []
            if stdout.strip():
                try:
                    raw_json = json.loads(stdout)
                    if isinstance(raw_json, dict):
                        results = raw_json.get("results", {})
                        if isinstance(results, dict):
                            parsed_items = results.get("failed_checks", [])
                        elif "failed_checks" in raw_json:
                            parsed_items = raw_json.get("failed_checks", [])
                    elif isinstance(raw_json, list):
                        for report in raw_json:
                            if isinstance(report, dict):
                                results = report.get("results", {})
                                if isinstance(results, dict):
                                    parsed_items.extend(results.get("failed_checks", []))
                except json.JSONDecodeError as exc:
                    stderr = f"Failed to parse Checkov JSON output: {exc}\n{stderr}"

            return RawScannerResult(
                scanner_name=self.scanner_name,
                target=str(validated_target),
                exit_code=exit_code,
                raw_stdout=stdout,
                raw_stderr=stderr,
                execution_time_seconds=round(duration, 3),
                parsed_items=parsed_items
            )

        except subprocess.TimeoutExpired:
            duration = time.perf_counter() - start_time
            return RawScannerResult(
                scanner_name=self.scanner_name,
                target=str(validated_target),
                exit_code=124,
                raw_stdout="",
                raw_stderr=f"Checkov execution timed out after {self.timeout_seconds} seconds.",
                execution_time_seconds=round(duration, 3),
                parsed_items=[]
            )
        except Exception as exc:
            duration = time.perf_counter() - start_time
            return RawScannerResult(
                scanner_name=self.scanner_name,
                target=str(validated_target),
                exit_code=1,
                raw_stdout="",
                raw_stderr=f"Execution error: {exc}",
                execution_time_seconds=round(duration, 3),
                parsed_items=[]
            )
