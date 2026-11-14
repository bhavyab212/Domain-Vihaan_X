# External Tool Integrations Specification — Domain-Vihaan_X

> **Document ID:** INT-001  
> **Project Name:** Domain-Vihaan_X  
> **Domain:** Cybersecurity (VIHAAN X Hackathon)  
> **Document Status:** PROPOSED (Under Review by Core Team)  
> **Author:** Principal Cybersecurity Architect & Systems Engineer  
> **Last Updated:** 2026-11-14T23:44:00+05:30  
> **Target Release:** Hackathon MVP (v0.1.0)  

---

## 1. Integration Architectural Model

**Domain-Vihaan_X** consumes security telemetry from specialized open-source scanners and execution engines. To maintain strict control plane reliability, security boundaries, and prevent command injection, external tools are never called directly through user-controlled shell strings. 

Instead, every tool operates behind a dedicated, typed **Adapter**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FASTAPI CONTROL PLANE                           │
│                      (ScannerOrchestrator)                             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                        Target Allowlist Verification
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
    ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
    │GitleaksAdapter│       │ CheckovAdapter│       │ TrivyAdapter  │
    └───────┬───────┘       └───────┬───────┘       └───────┬───────┘
            │                       │                       │
      `shell=False`           `shell=False`           `shell=False`
     Strict Timeout          Strict Timeout          Strict Timeout
            ▼                       ▼                       ▼
    ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
    │ Gitleaks CLI  │       │  Checkov CLI  │       │   Trivy CLI   │
    └───────────────┘       └───────────────┘       └───────────────┘
```

---

## 2. Integrated Tool Catalogue

| Integration Name | Primary Security Domain | Invocation Mechanism | Scope Tier | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Gitleaks** | AppSec (Secret Detection) | Local CLI Subprocess | **MVP Core (P0)** | **[IMPLEMENTED]** |
| **Checkov** | InfraSec (IaC & Cloud Misconfig) | Local CLI Subprocess | **MVP Core (P0)** | **[IMPLEMENTED]** |
| **Trivy** | AppSec (SCA & Container Config) | Local CLI Subprocess | **MVP Core (P0)** | PROPOSED |
| **HexStrike-AI** | Execution Framework (DAST/Port/MCP) | Hardened Localhost REST Adapter | **MVP Core (P0)** | **[IMPLEMENTED]** |
| **Subfinder** | Attack Surface (Subdomain Enum) | Local CLI Subprocess | **MVP Core (P0)** | **[IMPLEMENTED]** |
| **Nuclei** | Attack Surface (Template Vulnerabilities)| Local CLI Subprocess | Post-MVP (P1) | DEFERRED |
| **Nmap** | Attack Surface (Port Scanning) | Local CLI Subprocess | Post-MVP (P1) | DEFERRED |
| **OSV-Scanner** | AppSec (Open Source Vulnerability) | Local CLI Subprocess | Post-MVP (P1) | DEFERRED |

---

## 3. Tool Specifications

### 3.1 Gitleaks (Secret Detection)
- **Purpose:** Scans git repositories and configuration directories for exposed secrets, API keys, private keys, and authentication tokens.
- **Scope Classification:** `MVP Core (P0)`.
- **Required System Access:** Read-only filesystem access to target repository path. Zero network privileges required.
- **Input Format:** Local directory path (e.g., `/mock_env/acme-backend`).
- **Invocation Command:**
  ```bash
  gitleaks dir --path=/mock_env/acme-backend --report-format=json --report-path=/tmp/gitleaks_out.json --exit-code=0
  ```
- **Output Format:** JSON array of secret matches containing `RuleID`, `Secret`, `File`, `StartLine`, `Commit`.
- **Security Restrictions:**
  - `path` argument must be canonicalized and validated against the local repository allowlist.
  - Raw unmasked secret strings must be quarantined and masked immediately before database insertion.
- **Expected Failure Modes & Handling:**
  - *Missing binary:* Adapter catches `FileNotFoundError` and logs a configuration error.
  - *Repository permissions:* Read errors handled with `ScanExecution(status=FAILED)`.

---

### 3.2 Checkov (Infrastructure-as-Code Security)
- **Purpose:** Audits Terraform, CloudFormation, Dockerfile, and Kubernetes YAML files for security misconfigurations and overly permissive IAM policies.
- **Scope Classification:** `MVP Core (P0)`.
- **Required System Access:** Read-only filesystem access to target IaC directory.
- **Input Format:** Directory containing IaC files (e.g., `/mock_env/terraform`).
- **Invocation Command:**
  ```bash
  checkov -d /mock_env/terraform --output json --soft-fail
  ```
- **Output Format:** JSON containing `results.failed_checks` with `check_id`, `check_name`, `resource`, `file_path`, `guideline`.
- **Security Restrictions:**
  - Python execution environment must be isolated to prevent malicious external module loading.
  - `--soft-fail` flag used to ensure non-zero exit codes do not disrupt orchestrator workflow.
- **Expected Failure Modes & Handling:**
  - *Parsing syntax error in Terraform:* Handled gracefully; checkov returns partial results or empty list.

---

### 3.3 Trivy (Dependency & Container Scanning)
- **Purpose:** Comprehensive scanner for software dependencies (SCA), container images, and Kubernetes configurations.
- **Scope Classification:** `MVP Core (P0)`.
- **Required System Access:** Read-only filesystem access to repository root (`package.json`, `requirements.txt`, `go.mod`).
- **Input Format:** Directory path or container image tag.
- **Invocation Command:**
  ```bash
  trivy fs /mock_env/acme-backend --format json --output /tmp/trivy_out.json
  ```
- **Output Format:** JSON array of `Results` with `Vulnerabilities` (CVE ID, PkgName, InstalledVersion, FixedVersion, Severity).
- **Security Restrictions:**
  - Trivy database updates are performed out-of-band; scans use cached vulnerability databases to prevent network timeouts during hackathon demos.
- **Expected Failure Modes & Handling:**
  - *Missing lockfile:* Trivy returns empty vulnerability list; adapter marks scan as `COMPLETED_NO_DEPENDENCIES`.

---

### 3.4 Subfinder (Subdomain Discovery)
- **Purpose:** Fast passive subdomain discovery for external attack surface asset cataloging.
- **Scope Classification:** `MVP Core (P0)`.
- **Required System Access:** Outbound DNS and HTTPS network access to public discovery APIs.
- **Input Format:** Validated domain string (e.g., `acmecloud.internal` or authorized test domain).
- **Invocation Command:**
  ```bash
  subfinder -d acmecloud.com -json -silent
  ```
- **Output Format:** JSON Lines containing discovered `host` and `source`.
- **Security Restrictions:**
  - Strict domain regex validation: `^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$`.
  - Enforce explicit organization domain allowlist; scanning arbitrary external domains is strictly prohibited.
- **Expected Failure Modes & Handling:**
  - *DNS resolution timeout / No network:* Adapter returns cached or empty discovery list without crashing.

---

### 3.5 HexStrike-AI Integration Adapter
- **Purpose:** Underlying penetration testing and tool execution engine for executing advanced DAST checks, specialized web assessment modules, and MCP tool workflows.
- **Scope Classification:** `MVP Core (P0)`.
- **Architectural Boundary:**
  - HexStrike-AI is **strictly an underlying execution worker**, not the core intelligence of Domain-Vihaan_X.
  - Proprietary graph logic, attack-path correlation, contextual scoring, and remediation remain exclusively in our Control Plane.
- **Invocation Mechanism:**
  - Communicates via local REST API or MCP JSON-RPC protocol binding strictly to `127.0.0.1`.
- **Input Format:** Strongly typed JSON payload specifying:
  ```json
  {
    "tool_target": "http://127.0.0.1:8080/mock_service",
    "scan_profile": "PASSIVE_WEB_AUDIT",
    "timeout_seconds": 30
  }
  ```
- **Output Format:** Structured JSON scan results.
- **Security Restrictions (MANDATORY):**
  1. HexStrike must never be exposed to public network interfaces.
  2. No arbitrary shell commands or unsanitized flags may be passed to HexStrike.
  3. All targets passed to HexStrike must exist in the verified Target Allowlist.
  4. HexStrike outputs are strictly normalized by `app/normalizer/hexstrike_parser.py`.
- **Expected Failure Modes & Handling:**
  - *HexStrike process not running / MCP disconnected:* Adapter logs `WARNING: HexStrike unavailable. Falling back to native CLI runners.` Core platform remains fully operational.

---

### 3.6 Nuclei & Nmap (Deferred to Post-MVP)
- **Nuclei:** Template-based vulnerability scanner for active perimeter assessment. Deferred to v0.2 to avoid live active probing risks during the hackathon.
- **Nmap:** Network port scanner. Deferred to v0.2 to avoid triggering network intrusion alarms in hackathon hosting environments.

---

## 4. Normalization Mapping Table

| Source Tool | Source Severity | Domain-Vihaan_X Severity | Category |
| :--- | :--- | :--- | :--- |
| **Gitleaks** | (Always considered high-impact) | `CRITICAL` or `HIGH` | `SECRET` |
| **Checkov** | `FAILED` (HIGH check) | `HIGH` | `IAC` |
| **Checkov** | `FAILED` (MEDIUM check) | `MEDIUM` | `IAC` |
| **Checkov** | `PASSED` | Filtered (Not recorded) | - |
| **Trivy** | `CRITICAL` (CVSS >= 9.0) | `CRITICAL` | `DEPENDENCY` |
| **Trivy** | `HIGH` (CVSS 7.0–8.9) | `HIGH` | `DEPENDENCY` |
| **Trivy** | `MEDIUM` (CVSS 4.0–6.9) | `MEDIUM` | `DEPENDENCY` |
| **Trivy** | `LOW` (CVSS 0.1–3.9) | `LOW` | `DEPENDENCY` |
| **Subfinder** | Informational | `INFORMATIONAL` | `PERIMETER` |
| **HexStrike-AI**| High / Medium / Low | Mapped via `HexStrikeNormalizer`| `PERIMETER` / `CONFIG` |
