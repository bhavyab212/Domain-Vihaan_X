# apps/backend/app/integrations/scanners/gitleaks.py
"""
Gitleaks secret scanner CLI subprocess adapter.
Enforces parameterized execution (shell=False), target validation, mandatory timeout,
secret redaction, and offline DEMO_MODE fallback.
"""

import os
import json
import time
import shutil
import asyncio
import tempfile
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.integrations.scanners.base import BaseScannerAdapter, RawScannerResult
from app.core.safety import validate_target_path, get_project_root
from app.core.config import settings
from app.intelligence.normalizer import redact_secret_values


class GitleaksScannerAdapter(BaseScannerAdapter):
    """
    Adapter for Gitleaks secret scanner.
    """

    def __init__(self, timeout_seconds: int = 60):
        super().__init__(scanner_name="gitleaks", timeout_seconds=timeout_seconds)

    async def is_available(self) -> bool:
        """Checks if gitleaks binary is present on system PATH."""
        return shutil.which("gitleaks") is not None

    async def execute_scan(self, target_path: str) -> RawScannerResult:
        """
        Executes gitleaks in an isolated sandbox with strict safety boundaries.
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
                # Load canonical synthetic demo fixtures
                fixtures_path = get_project_root() / "apps" / "backend" / "tests" / "fixtures" / "gitleaks_output.json"
                parsed_items = []
                if fixtures_path.exists():
                    try:
                        parsed_items = json.loads(fixtures_path.read_text(encoding="utf-8"))
                    except Exception:
                        parsed_items = []

                # Redact synthetic items
                redacted_items = []
                for item in parsed_items:
                    clean_item = dict(item)
                    if "Secret" in clean_item:
                        clean_item["Secret"] = "***REDACTED***"
                    if "Match" in clean_item:
                        clean_item["Match"] = "***REDACTED***"
                    redacted_items.append(clean_item)

                return RawScannerResult(
                    scanner_name=self.scanner_name,
                    target=str(validated_target),
                    exit_code=0,
                    raw_stdout="[DEMO_MODE] Synthetic secret telemetry loaded successfully.",
                    raw_stderr="",
                    execution_time_seconds=round(duration, 3),
                    parsed_items=redacted_items
                )
            else:
                return RawScannerResult(
                    scanner_name=self.scanner_name,
                    target=str(validated_target),
                    exit_code=127,
                    raw_stdout="",
                    raw_stderr="gitleaks binary not found on system PATH in LIVE_ASSESSMENT_MODE.",
                    execution_time_seconds=round(duration, 3),
                    parsed_items=[]
                )

        # Step 3: Sandboxed CLI execution
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as temp_report:
            report_file_path = Path(temp_report.name)

        cmd = [
            "gitleaks",
            "dir",
            str(validated_target),
            "--report-format",
            "json",
            "--report-path",
            str(report_file_path),
            "--no-banner",
        ]

        def _run_subprocess():
            return subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                shell=False,
                timeout=self.timeout_seconds,
            )

        try:
            proc = await asyncio.to_thread(_run_subprocess)
            exit_code = proc.returncode
            stdout = proc.stdout or ""
            stderr = proc.stderr or ""

            parsed_items = []
            if report_file_path.exists():
                content = report_file_path.read_text(encoding="utf-8").strip()
                if content:
                    try:
                        raw_parsed = json.loads(content)
                        if isinstance(raw_parsed, list):
                            for item in raw_parsed:
                                clean_item = dict(item)
                                if "Secret" in clean_item:
                                    clean_item["Secret"] = "***REDACTED***"
                                if "Match" in clean_item:
                                    clean_item["Match"] = "***REDACTED***"
                                parsed_items.append(clean_item)
                    except json.JSONDecodeError:
                        stderr += "\nWarning: Failed to decode gitleaks JSON report."

            # Redact raw stdout/stderr
            clean_stdout = redact_secret_values(stdout)
            clean_stderr = redact_secret_values(stderr)
            duration = time.perf_counter() - start_time

            return RawScannerResult(
                scanner_name=self.scanner_name,
                target=str(validated_target),
                exit_code=exit_code,
                raw_stdout=clean_stdout,
                raw_stderr=clean_stderr,
                execution_time_seconds=round(duration, 3),
                parsed_items=parsed_items,
            )

        except subprocess.TimeoutExpired:
            duration = time.perf_counter() - start_time
            return RawScannerResult(
                scanner_name=self.scanner_name,
                target=str(validated_target),
                exit_code=124,
                raw_stdout="",
                raw_stderr=f"Gitleaks execution timed out after {self.timeout_seconds} seconds.",
                execution_time_seconds=round(duration, 3),
                parsed_items=[],
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
                parsed_items=[],
            )
        finally:
            if report_file_path.exists():
                try:
                    os.unlink(report_file_path)
                except Exception:
                    pass
