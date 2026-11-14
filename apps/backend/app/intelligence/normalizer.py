# apps/backend/app/intelligence/normalizer.py
"""
Finding Normalization Engine.
Transforms heterogeneous scanner outputs (Gitleaks, Checkov, Trivy, Subfinder)
into canonical FindingResponse objects conforming to contracts/schemas/finding.schema.json.

Guarantees:
1. Deterministic fingerprinting (SHA-256).
2. Secret value redaction (zero secret leakage).
3. Explicit provenance tracking (OBSERVED vs SIMULATED_DEMO).
4. Malformed input resilience and quarantine logging.
5. Deduplication across findings.
"""

import json
import re
import hashlib
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Set
from pydantic import BaseModel, Field

from app.schemas.finding import FindingResponse, LocationInfo

logger = logging.getLogger("vihaan_x")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


SECRET_RE = re.compile(
    r"(AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36}|-----BEGIN[ A-Z_-]*PRIVATE KEY-----|password\s*=\s*['\"][^'\"]+['\"])",
    re.IGNORECASE
)


class QuarantinedRecord(BaseModel):
    scanner: str
    asset_id: str
    error: str
    raw_snippet: str
    quarantined_at: str


class NormalizationResult(BaseModel):
    findings: List[FindingResponse] = Field(default_factory=list)
    quarantined: List[QuarantinedRecord] = Field(default_factory=list)


def compute_finding_fingerprint(scanner: str, asset_id: str, rule_or_cve: str, location_str: str) -> str:
    """
    Computes deterministic SHA-256 fingerprint for finding deduplication.
    Output format: find-{hex:12}
    """
    normalized_key = f"{scanner.lower().strip()}:{asset_id.strip()}:{rule_or_cve.strip()}:{location_str.strip()}"
    digest = hashlib.sha256(normalized_key.encode("utf-8")).hexdigest()
    return f"find-{digest[:12]}"


def redact_secret_values(text: Optional[str], specific_secret: Optional[str] = None) -> str:
    """
    Strictly redacts sensitive credentials and secrets from finding strings.
    """
    if not text:
        return ""
    
    redacted = text
    if specific_secret and specific_secret in redacted:
        redacted = redacted.replace(specific_secret, "***REDACTED***")
    
    # Apply regex redaction for common pattern leaks
    redacted = SECRET_RE.sub("***REDACTED***", redacted)
    return redacted


class FindingNormalizer:
    """
    Modular, deterministic finding normalization pipeline.
    """

    @classmethod
    def normalize_gitleaks(
        cls,
        raw_items: List[Dict[str, Any]],
        asset_id: str,
        provenance: str = "OBSERVED"
    ) -> List[FindingResponse]:
        """
        Normalizes Gitleaks JSON reports, enforcing complete secret redaction.
        """
        findings: List[FindingResponse] = []
        for item in raw_items:
            secret_val = item.get("Secret") or item.get("Match") or ""
            file_path = item.get("File", "unknown_file")
            start_line = item.get("StartLine") or item.get("EndLine")
            rule_id = item.get("RuleID", "generic-secret")
            desc = item.get("Description", "Exposed Secret")

            clean_desc = redact_secret_values(
                f"Credential or secret detected: {desc} in {file_path}",
                specific_secret=secret_val
            )

            location_str = f"{file_path}:{start_line}"
            f_id = compute_finding_fingerprint("gitleaks", asset_id, rule_id, location_str)

            findings.append(
                FindingResponse(
                    id=f_id,
                    title=f"Secret Leak Detected: {desc}",
                    description=clean_desc,
                    severity="CRITICAL",
                    scanner="gitleaks",
                    assetId=asset_id,
                    cveId=None,
                    cvssScore=9.5,
                    provenance=provenance,
                    location=LocationInfo(
                        file=file_path,
                        line=int(start_line) if start_line is not None else None,
                        resource=None
                    ),
                    remediationGuidance="Immediately revoke the exposed secret and store credentials in an isolated secret vault or KMS.",
                    status="OPEN",
                    discoveredAt=utc_now_iso()
                )
            )
        return findings

    @classmethod
    def normalize_checkov(
        cls,
        raw_data: Any,
        asset_id: str,
        provenance: str = "OBSERVED"
    ) -> List[FindingResponse]:
        """
        Normalizes Checkov IaC security evaluation reports.
        """
        failed_checks: List[Dict[str, Any]] = []

        if isinstance(raw_data, dict):
            # Direct checkov output with "results"
            results_sec = raw_data.get("results")
            if isinstance(results_sec, dict):
                failed_checks.extend(results_sec.get("failed_checks", []))
            elif "failed_checks" in raw_data:
                failed_checks.extend(raw_data.get("failed_checks", []))
        elif isinstance(raw_data, list):
            # Checkov multi-framework report list
            for entry in raw_data:
                if isinstance(entry, dict):
                    results_sec = entry.get("results")
                    if isinstance(results_sec, dict):
                        failed_checks.extend(results_sec.get("failed_checks", []))
                    elif "check_id" in entry:
                        failed_checks.append(entry)

        findings: List[FindingResponse] = []
        for check in failed_checks:
            check_id = check.get("check_id", "UNKNOWN_CKV")
            check_name = check.get("check_name", "IaC Misconfiguration Detected")
            file_path = check.get("file_path") or check.get("repo_file_path", "")
            resource = check.get("resource")
            line_range = check.get("file_line_range")
            line = line_range[0] if (isinstance(line_range, list) and line_range) else None
            guideline = check.get("guideline")

            # Severity normalization
            raw_sev = str(check.get("severity") or "HIGH").upper()
            if raw_sev not in {"CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"}:
                raw_sev = "HIGH"

            cvss_map = {"CRITICAL": 9.0, "HIGH": 7.8, "MEDIUM": 5.5, "LOW": 3.0, "INFORMATIONAL": 1.0}
            cvss = cvss_map.get(raw_sev, 7.5)

            location_str = f"{file_path}:{line}:{resource}"
            f_id = compute_finding_fingerprint("checkov", asset_id, check_id, location_str)

            remediation = (
                f"Comply with policy {check_id}: {guideline}"
                if guideline
                else "Review IaC resource configuration against least-privilege benchmarks."
            )

            findings.append(
                FindingResponse(
                    id=f_id,
                    title=f"IaC Violation: {check_name}",
                    description=f"Infrastructure check {check_id} failed on resource '{resource or 'unspecified'}'.",
                    severity=raw_sev,
                    scanner="checkov",
                    assetId=asset_id,
                    cveId=None,
                    cvssScore=cvss,
                    provenance=provenance,
                    location=LocationInfo(
                        file=file_path if file_path else None,
                        line=int(line) if line is not None else None,
                        resource=resource
                    ),
                    remediationGuidance=remediation,
                    status="OPEN",
                    discoveredAt=utc_now_iso()
                )
            )
        return findings

    @classmethod
    def normalize_trivy(
        cls,
        raw_data: Any,
        asset_id: str,
        provenance: str = "OBSERVED"
    ) -> List[FindingResponse]:
        """
        Normalizes Trivy container image and dependency vulnerability reports.
        """
        findings: List[FindingResponse] = []
        results = raw_data.get("Results", []) if isinstance(raw_data, dict) else []

        for target_result in results:
            target_name = target_result.get("Target", "unknown_target")
            vulnerabilities = target_result.get("Vulnerabilities", [])
            for vuln in vulnerabilities:
                cve_id = vuln.get("VulnerabilityID", "UNKNOWN_CVE")
                pkg_name = vuln.get("PkgName", "unknown_pkg")
                installed_ver = vuln.get("InstalledVersion", "")
                fixed_ver = vuln.get("FixedVersion")
                title = vuln.get("Title") or f"Vulnerability in {pkg_name}"
                desc = vuln.get("Description") or f"Package {pkg_name} ({installed_ver}) contains {cve_id}."

                raw_sev = str(vuln.get("Severity", "MEDIUM")).upper()
                sev_map = {
                    "CRITICAL": "CRITICAL",
                    "HIGH": "HIGH",
                    "MEDIUM": "MEDIUM",
                    "LOW": "LOW",
                    "UNKNOWN": "INFORMATIONAL"
                }
                sev = sev_map.get(raw_sev, "MEDIUM")

                # Extract CVSS
                cvss_score = None
                cvss_obj = vuln.get("CVSS")
                if isinstance(cvss_obj, dict):
                    nvd = cvss_obj.get("nvd")
                    if isinstance(nvd, dict):
                        cvss_score = nvd.get("V3Score")
                    elif "V3Score" in cvss_obj:
                        cvss_score = cvss_obj.get("V3Score")

                if cvss_score is None:
                    default_cvss = {"CRITICAL": 9.2, "HIGH": 7.5, "MEDIUM": 5.0, "LOW": 2.5, "INFORMATIONAL": 1.0}
                    cvss_score = default_cvss.get(sev, 5.0)

                location_str = f"{target_name}:{pkg_name}:{installed_ver}"
                f_id = compute_finding_fingerprint("trivy", asset_id, cve_id, location_str)

                remediation = (
                    f"Upgrade package '{pkg_name}' to version {fixed_ver} or higher."
                    if fixed_ver
                    else f"Review dependency '{pkg_name}' for security advisories and alternative packages."
                )

                findings.append(
                    FindingResponse(
                        id=f_id,
                        title=f"{cve_id}: {title}",
                        description=desc,
                        severity=sev,
                        scanner="trivy",
                        assetId=asset_id,
                        cveId=cve_id if cve_id != "UNKNOWN_CVE" else None,
                        cvssScore=float(cvss_score) if cvss_score is not None else None,
                        provenance=provenance,
                        location=LocationInfo(
                            file=target_name,
                            line=None,
                            resource=f"{pkg_name}@{installed_ver}"
                        ),
                        remediationGuidance=remediation,
                        status="OPEN",
                        discoveredAt=utc_now_iso()
                    )
                )
        return findings

    @classmethod
    def normalize_hexstrike(
        cls,
        raw_data: Any,
        asset_id: str,
        provenance: str = "OBSERVED"
    ) -> List[FindingResponse]:
        """
        Normalizes HexStrike-AI DAST and security assessment findings.
        """
        items: List[Dict[str, Any]] = []
        if isinstance(raw_data, list):
            items = raw_data
        elif isinstance(raw_data, dict):
            items = raw_data.get("findings", [raw_data]) if "findings" in raw_data else [raw_data]

        findings: List[FindingResponse] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            finding_id = item.get("finding_id") or item.get("id") or "HEX-DAST-GENERIC"
            title = item.get("title") or "HexStrike Security Finding"
            desc = item.get("description") or title
            raw_sev = str(item.get("severity") or "MEDIUM").upper()
            if raw_sev not in {"CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"}:
                raw_sev = "MEDIUM"

            cvss = item.get("cvss_score") or item.get("cvss")
            if cvss is None:
                cvss_map = {"CRITICAL": 9.0, "HIGH": 7.5, "MEDIUM": 5.0, "LOW": 3.0, "INFORMATIONAL": 1.0}
                cvss = cvss_map.get(raw_sev, 5.0)

            target_loc = item.get("target_location") or item.get("location") or ""
            remediation = item.get("remediation_guidance") or "Review and remediate endpoint configuration."

            location_str = f"hexstrike:{target_loc}:{finding_id}"
            f_id = compute_finding_fingerprint("hexstrike", asset_id, finding_id, location_str)

            clean_desc = redact_secret_values(desc)

            findings.append(
                FindingResponse(
                    id=f_id,
                    title=f"HexStrike DAST: {title}",
                    description=clean_desc,
                    severity=raw_sev,
                    scanner="hexstrike",
                    assetId=asset_id,
                    cveId=None,
                    cvssScore=float(cvss),
                    provenance=provenance,
                    location=LocationInfo(
                        file=None,
                        line=None,
                        resource=target_loc if target_loc else None
                    ),
                    remediationGuidance=remediation,
                    status="OPEN",
                    discoveredAt=utc_now_iso()
                )
            )
        return findings

    @classmethod
    def normalize_subfinder(
        cls,
        raw_data: Any,
        asset_id: str,
        provenance: str = "OBSERVED"
    ) -> List[FindingResponse]:
        """
        Normalizes Subfinder external subdomain and attack surface enumeration output.
        """
        items: List[Dict[str, Any]] = []
        if isinstance(raw_data, list):
            for entry in raw_data:
                if isinstance(entry, dict):
                    items.append(entry)
                elif isinstance(entry, str):
                    items.append({"host": entry.strip()})
        elif isinstance(raw_data, dict):
            items.append(raw_data)
        elif isinstance(raw_data, str):
            for line in raw_data.splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    parsed = json.loads(line)
                    if isinstance(parsed, dict):
                        items.append(parsed)
                    else:
                        items.append({"host": str(parsed)})
                except Exception:
                    items.append({"host": line})

        findings: List[FindingResponse] = []
        for item in items:
            host = item.get("host") or item.get("subdomain") or ""
            if not host:
                continue
            ip = item.get("ip")
            source = item.get("source", "dns")

            # Identify potentially high-risk exposed subdomains
            lower_host = host.lower()
            if any(term in lower_host for term in ["admin", "internal", "staging", "dev", "vpn", "corp"]):
                sev = "MEDIUM"
                cvss = 5.2
            else:
                sev = "LOW"
                cvss = 3.1

            location_str = f"host:{host}"
            f_id = compute_finding_fingerprint("subfinder", asset_id, "discovered-subdomain", location_str)

            findings.append(
                FindingResponse(
                    id=f_id,
                    title=f"Exposed Subdomain Discovered: {host}",
                    description=f"External DNS discovery identified {host} (IP: {ip or 'unresolved'}) via source '{source}'.",
                    severity=sev,
                    scanner="subfinder",
                    assetId=asset_id,
                    cveId=None,
                    cvssScore=cvss,
                    provenance=provenance,
                    location=LocationInfo(
                        file=None,
                        line=None,
                        resource=host
                    ),
                    remediationGuidance="Verify domain DNS posture and ensure non-public environments are shielded by WAF or VPN.",
                    status="OPEN",
                    discoveredAt=utc_now_iso()
                )
            )
        return findings

    @classmethod
    def normalize(
        cls,
        scanner: str,
        raw_data: Any,
        asset_id: str,
        provenance: str = "OBSERVED"
    ) -> NormalizationResult:
        """
        Universal entrypoint for scanner normalization.
        Provides malformed input resilience, error quarantine, and deduplication.
        """
        scanner_key = scanner.lower().strip()
        parsed_data = raw_data
        quarantined: List[QuarantinedRecord] = []

        # If input is a raw JSON string, attempt parsing with quarantine fallback
        if isinstance(raw_data, str):
            try:
                parsed_data = json.loads(raw_data)
            except json.JSONDecodeError as exc:
                logger.warning(f"Malformed JSON from scanner '{scanner}': {exc}")
                quarantined.append(
                    QuarantinedRecord(
                        scanner=scanner_key,
                        asset_id=asset_id,
                        error=f"JSONDecodeError: {exc}",
                        raw_snippet=raw_data[:200],
                        quarantined_at=utc_now_iso()
                    )
                )
                return NormalizationResult(findings=[], quarantined=quarantined)

        findings: List[FindingResponse] = []
        try:
            if scanner_key == "gitleaks":
                if not isinstance(parsed_data, list):
                    parsed_data = [parsed_data] if isinstance(parsed_data, dict) else []
                findings = cls.normalize_gitleaks(parsed_data, asset_id, provenance)
            elif scanner_key == "checkov":
                findings = cls.normalize_checkov(parsed_data, asset_id, provenance)
            elif scanner_key == "trivy":
                findings = cls.normalize_trivy(parsed_data, asset_id, provenance)
            elif scanner_key == "subfinder":
                findings = cls.normalize_subfinder(parsed_data, asset_id, provenance)
            elif scanner_key == "hexstrike":
                findings = cls.normalize_hexstrike(parsed_data, asset_id, provenance)
            else:
                logger.warning(f"Unrecognized scanner type '{scanner}'")
                quarantined.append(
                    QuarantinedRecord(
                        scanner=scanner_key,
                        asset_id=asset_id,
                        error=f"Unsupported scanner engine '{scanner}'",
                        raw_snippet=str(raw_data)[:200],
                        quarantined_at=utc_now_iso()
                    )
                )
        except Exception as exc:
            logger.error(f"Error normalizing data for scanner '{scanner}': {exc}", exc_info=True)
            quarantined.append(
                QuarantinedRecord(
                    scanner=scanner_key,
                    asset_id=asset_id,
                    error=f"NormalizationException: {exc}",
                    raw_snippet=str(raw_data)[:200],
                    quarantined_at=utc_now_iso()
                )
            )

        # Deduplicate findings by finding.id
        seen_ids: Set[str] = set()
        deduped: List[FindingResponse] = []
        for f in findings:
            if f.id not in seen_ids:
                seen_ids.add(f.id)
                deduped.append(f)

        return NormalizationResult(findings=deduped, quarantined=quarantined)
