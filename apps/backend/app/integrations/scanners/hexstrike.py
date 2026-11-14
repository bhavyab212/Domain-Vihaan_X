# apps/backend/app/integrations/scanners/hexstrike.py
"""
HexStrike-AI integration adapter.
Conforms to ADR-003, ADR-008, and docs/04-quality-and-security/HEXSTRIKE_INTEGRATION.md.
Communicates strictly via localhost/loopback. Never permits direct public exposure or raw command injection.
"""

import json
import logging
import re
import urllib.parse
from pathlib import Path
from typing import Optional, Dict, Any, List
import httpx

from app.integrations.scanners.base import BaseScannerAdapter, RawScannerResult
from app.core.config import settings
from app.core.safety import SecurityBoundaryError, validate_target_domain

logger = logging.getLogger(__name__)

# Frozen immutable scan profiles (HexStrike Section 4.3)
SCAN_PROFILE_PASSIVE_RECON = "PROFILE_PASSIVE_RECON"
SCAN_PROFILE_WEB_AUDIT = "PROFILE_WEB_AUDIT"
SCAN_PROFILE_LOCAL_PORT_CHECK = "PROFILE_LOCAL_PORT_CHECK"

ALLOWED_SCAN_PROFILES = {
    SCAN_PROFILE_PASSIVE_RECON,
    SCAN_PROFILE_WEB_AUDIT,
    SCAN_PROFILE_LOCAL_PORT_CHECK,
}

LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "::1"}


def _redact_secrets(text: str, custom_secret: Optional[str] = None) -> str:
    """Redacts tokens, API keys, and sensitive strings from logs and output."""
    if not text:
        return ""
    redacted = text
    if custom_secret and len(custom_secret) > 3:
        redacted = redacted.replace(custom_secret, "[REDACTED]")
    # Redact common token patterns: Bearer tokens, token=..., etc.
    redacted = re.sub(r"(Bearer\s+)[A-Za-z0-9_\-\.]{8,}", r"\1[REDACTED]", redacted, flags=re.IGNORECASE)
    redacted = re.sub(r"(token=)[A-Za-z0-9_\-\.]{8,}", r"\1[REDACTED]", redacted, flags=re.IGNORECASE)
    return redacted


class HexStrikeAdapter(BaseScannerAdapter):
    """
    Hardened adapter for interacting with local HexStrike-AI execution worker.
    Enforces loopback-only binding, target allowlisting, frozen scan profiles, and secret redaction.
    """

    def __init__(
        self,
        endpoint_url: Optional[str] = None,
        auth_token: Optional[str] = None,
        timeout_seconds: int = 30
    ):
        super().__init__(scanner_name="hexstrike", timeout_seconds=timeout_seconds)
        raw_url = endpoint_url if endpoint_url is not None else settings.HEXSTRIKE_MCP_URL
        self.endpoint_url = raw_url.strip() if raw_url else ""
        self.auth_token = auth_token or ""

        if self.endpoint_url:
            self._validate_loopback_endpoint(self.endpoint_url)

    def _validate_loopback_endpoint(self, url: str) -> None:
        """Enforces that the service endpoint strictly binds to local loopback interface."""
        parsed = urllib.parse.urlparse(url)
        hostname = parsed.hostname
        if not hostname or hostname.lower() not in LOOPBACK_HOSTS:
            raise SecurityBoundaryError(
                f"Loopback Violation: HexStrike endpoint '{url}' must bind strictly to 127.0.0.1 or localhost."
            )

    def validate_target(self, target: str) -> bool:
        """
        Validates target against authorized domains and loopback expressions.
        Rejects arbitrary external targets.
        """
        if not target or not isinstance(target, str):
            raise SecurityBoundaryError("Invalid target: target cannot be empty.")

        clean_target = target.strip()
        # Parse potential URL
        parsed = urllib.parse.urlparse(clean_target)
        host = parsed.hostname or clean_target.split(":")[0]

        # Check allowed target domains
        allowed = [d.lower() for d in settings.ALLOWED_TARGET_DOMAINS]
        if host.lower() in allowed or host.lower() in LOOPBACK_HOSTS:
            return True

        # Check loopback regex
        if re.match(r"^127\.0\.0\.1:[0-9]+$", clean_target) or re.match(r"^localhost:[0-9]+$", clean_target):
            return True

        raise SecurityBoundaryError(
            f"Security Boundary Violation: Target '{target}' is not in the authorized target allowlist."
        )

    def validate_profile(self, profile: str) -> bool:
        """Ensures only frozen, pre-approved scan profiles are executed."""
        if profile not in ALLOWED_SCAN_PROFILES:
            raise SecurityBoundaryError(
                f"Invalid or unapproved scan profile '{profile}'. "
                f"Arbitrary flags and unapproved profiles are prohibited. Allowed: {sorted(list(ALLOWED_SCAN_PROFILES))}"
            )
        return True

    async def is_available(self) -> bool:
        """Verifies if HexStrike service is responsive on configured localhost endpoint."""
        if not self.endpoint_url:
            return False
        try:
            headers = {}
            if self.auth_token:
                headers["Authorization"] = f"Bearer {self.auth_token}"
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.endpoint_url}/health", headers=headers)
                return res.status_code == 200
        except Exception as e:
            logger.debug("HexStrike availability check failed: %s", e)
            return False

    def _load_synthetic_demo_findings(self, target: str, profile: str) -> List[Dict[str, Any]]:
        """Loads certified synthetic demonstration findings when offline in DEMO_MODE."""
        fixture_path = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "hexstrike_output.json"
        if fixture_path.exists():
            try:
                with open(fixture_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    findings = data.get("findings", [])
                    # Inject or normalize target and profile
                    for item in findings:
                        item["source"] = "hexstrike"
                        item["scan_profile"] = profile
                    return findings
            except Exception as e:
                logger.error("Failed to load synthetic hexstrike fixture: %s", e)

        # Fallback inline synthetic items if fixture file missing
        return [
            {
                "finding_id": "HEX-DAST-001",
                "source": "hexstrike",
                "tool": "hexstrike",
                "scan_profile": profile,
                "category": "WEB_SECURITY",
                "severity": "HIGH",
                "title": "Cross-Origin Resource Sharing (CORS) Wildcard with Credentials",
                "target_location": f"https://{target}/v1/auth",
                "cvss_score": 7.5,
                "provenance": "SIMULATED_DEMO",
            }
        ]

    async def execute_scan(self, target: str, profile: str = SCAN_PROFILE_WEB_AUDIT) -> RawScannerResult:
        """
        Executes a security scan via HexStrike with target allowlist verification and profile confinement.
        Falls back seamlessly to synthetic fixtures in DEMO_MODE if service is unavailable.
        """
        self.validate_target(target)
        self.validate_profile(profile)

        is_avail = await self.is_available()

        if not is_avail:
            in_demo_mode = (getattr(settings, "DEFAULT_OPERATING_MODE", "DEMO_MODE") == "DEMO_MODE")
            if in_demo_mode:
                synthetic_findings = self._load_synthetic_demo_findings(target, profile)
                raw_json = json.dumps({"status": "completed", "profile": profile, "findings": synthetic_findings})
                redacted_json = _redact_secrets(raw_json, self.auth_token)
                return RawScannerResult(
                    scanner_name=self.scanner_name,
                    target=target,
                    exit_code=0,
                    raw_stdout=redacted_json,
                    raw_stderr=(
                        "[DEMO_MODE] HexStrike service unavailable on loopback; "
                        "loaded certified synthetic demonstration fixtures."
                    ),
                    execution_time_seconds=0.05,
                    parsed_items=synthetic_findings,
                )
            else:
                return RawScannerResult(
                    scanner_name=self.scanner_name,
                    target=target,
                    exit_code=1,
                    raw_stdout="",
                    raw_stderr="HexStrike service unavailable or unconfigured on localhost. Live assessment cannot reach execution worker.",
                    execution_time_seconds=0.0,
                    parsed_items=[],
                )

        # Live invocation against local HexStrike service
        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"

        payload = {
            "target": target,
            "profile": profile,
        }

        try:
            async with httpx.AsyncClient(timeout=float(self.timeout_seconds)) as client:
                res = await client.post(
                    f"{self.endpoint_url}/scan",
                    json=payload,
                    headers=headers
                )

            raw_text = _redact_secrets(res.text, self.auth_token)

            if res.status_code == 200:
                data = res.json()
                findings = data.get("findings", [])
                for item in findings:
                    item["source"] = "hexstrike"
                    item["scan_profile"] = profile
                return RawScannerResult(
                    scanner_name=self.scanner_name,
                    target=target,
                    exit_code=0,
                    raw_stdout=raw_text,
                    raw_stderr="",
                    execution_time_seconds=1.2,
                    parsed_items=findings,
                )
            else:
                return RawScannerResult(
                    scanner_name=self.scanner_name,
                    target=target,
                    exit_code=res.status_code,
                    raw_stdout=raw_text,
                    raw_stderr=_redact_secrets(f"HexStrike returned HTTP {res.status_code}: {res.text}", self.auth_token),
                    execution_time_seconds=0.5,
                    parsed_items=[],
                )

        except httpx.TimeoutException:
            logger.warning("HexStrike request timed out after %ds for target '%s'", self.timeout_seconds, target)
            return RawScannerResult(
                scanner_name=self.scanner_name,
                target=target,
                exit_code=124,
                raw_stdout="",
                raw_stderr=f"HexStrike execution request timed out after {self.timeout_seconds} seconds.",
                execution_time_seconds=float(self.timeout_seconds),
                parsed_items=[],
            )
        except Exception as e:
            logger.error("HexStrike execution error: %s", e)
            err_msg = _redact_secrets(str(e), self.auth_token)
            return RawScannerResult(
                scanner_name=self.scanner_name,
                target=target,
                exit_code=1,
                raw_stdout="",
                raw_stderr=f"HexStrike execution failed: {err_msg}",
                execution_time_seconds=0.0,
                parsed_items=[],
            )
