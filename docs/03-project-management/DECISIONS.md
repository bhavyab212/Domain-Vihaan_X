# Architecture Decision Records (ADRs) — Domain-Vihaan_X

> **Document ID:** ADR-LOG-001  
> **Project Name:** Domain-Vihaan_X  
> **Domain:** Cybersecurity (VIHAAN X Hackathon)  
> **Status:** ACTIVE REGISTER  
> **Last Updated:** 2026-11-15T00:28:00+05:30  
> **Core Strategic Philosophy:** **Frontend-first. Backend-reliable. Demo-driven.**  

---

## ADR Index

| ADR ID | Decision Title | Status | Decision Owner | Date |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-001** | Narrow Hackathon MVP to Three Security Domains | **ACCEPTED** | Product & Architecture Lead | 2026-11-14 |
| **ADR-002** | Business Security Graph as Primary Differentiator | **ACCEPTED** | Lead Systems Architect | 2026-11-14 |
| **ADR-003** | HexStrike-AI as Underlying Execution Component | **ACCEPTED** | Cybersecurity Architect | 2026-11-14 |
| **ADR-004** | Restricted Scanner Adapter & Isolated Subprocess Model | **ACCEPTED** | Security & Backend Lead | 2026-11-14 |
| **ADR-005** | SQLite in WAL Mode as Initial Hackathon Database | **PROPOSED** | Backend Lead | 2026-11-14 |
| **ADR-006** | React Flow (`@xyflow/react`) for Graph Visualization | **PROPOSED** | Frontend Lead | 2026-11-14 |
| **ADR-007** | Human-Approved Remediation Workflow for Hackathon MVP | **ACCEPTED** | Product & Security Lead | 2026-11-14 |
| **ADR-008** | Deterministic Contextual Risk Scoring with AI Summaries | **ACCEPTED** | Architecture & AI Lead | 2026-11-15 |
| **ADR-009** | Synthetic Test Assets and Controlled Demo Scenario | **ACCEPTED** | Core Engineering Team | 2026-11-14 |
| **ADR-010** | Frontend-First Judging Experience & Five Primary UIs | **PROPOSED** | Core Engineering Team | 2026-11-15 |
| **ADR-011** | Deterministic Demo Mode Separated from Live Assessment | **PROPOSED** | Architecture & Product Lead | 2026-11-15 |
| **ADR-012** | Graceful Backend Degradation & LLM Independence | **PROPOSED** | Backend & Security Lead | 2026-11-15 |
| **ADR-013** | Evidence Provenance & Transparent Simulated Findings | **PROPOSED** | Quality & Architecture Lead | 2026-11-15 |

---

## ADR-001: Narrow Hackathon MVP to Three Security Domains

- **Date:** 2026-11-14
- **Status:** `ACCEPTED`
- **Decision Owner:** Product & Architecture Lead
- **Related Documents:** [`docs/01-product/PRD.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/01-product/PRD.md)

### Context
A complete enterprise cybersecurity platform encompasses runtime endpoint protection (EDR), eBPF kernel monitoring, cloud identity governance, dark web OSINT, and SIEM event streaming. Attempting to build or simulate this vast footprint within the tight constraints of a hackathon risks producing a superficial, broken prototype.

### Options Considered
1. *Broad Enterprise Scope:* Ingest cloud logs, Kubernetes runtime, endpoint agents, code repos, and network traffic.
2. *Single Domain Scope:* Focus purely on code repository scanning (AppSec only).
3. *Triad Domain Scope (Selected):* Focus on the intersection of Application Security, Infrastructure Security, and External Attack Surface.

### Decision
Narrow the hackathon MVP to three specific, high-leverage domains:
1. Application Security (Gitleaks, Trivy).
2. Infrastructure Security (Checkov, IaC).
3. External Attack Surface (Subfinder, Nuclei).

### Rationale
These three domains represent the exact attack surface modern SaaS startups expose to the internet. They provide sufficient cross-domain breadth to demonstrate multi-hop attack paths without overwhelming engineering capacity.

### Consequences
- **Positive:** Feasible to implement robustly within the hackathon timeline; delivers a coherent, credible product narrative.
- **Negative:** Omits runtime host process monitoring and live network packet inspection.

---

## ADR-002: Business Security Graph as Primary Differentiator

- **Date:** 2026-11-14
- **Status:** `ACCEPTED`
- **Decision Owner:** Lead Systems Architect
- **Related Documents:** [`docs/02-architecture/TECHNICAL_IMPLEMENTATION.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/02-architecture/TECHNICAL_IMPLEMENTATION.md)

### Context
Every standard scanner produces tabular lists of vulnerabilities. Tabular lists create alert fatigue and fail to explain how vulnerabilities combine into dangerous exploit chains.

### Options Considered
1. *Tabular Vulnerability Dashboard:* Traditional sortable table grouped by severity (like typical open-source tools).
2. *Business Security Graph (Selected):* Directed property graph connecting Assets (Repositories, S3 Buckets, IAM Roles, Domains) and Findings via operational relationships.

### Decision
Establish the **Business Security Graph** as the core architectural construct and user interface differentiator of Domain-Vihaan_X.

### Rationale
The graph enables algorithmic detection of multi-hop attack paths (e.g., Leaked Secret -> IAM Role -> S3 Bucket) that are completely invisible in isolated tool outputs.

### Consequences
- **Positive:** High visual impact for hackathon judges; immediate clarity for developers; uniquely explains business impact.
- **Negative:** Requires graph data structure modeling, path traversal algorithms, and interactive canvas UI components.

---

## ADR-003: HexStrike-AI as an Underlying Execution Component

- **Date:** 2026-11-14
- **Status:** `ACCEPTED`
- **Decision Owner:** Cybersecurity Architect
- **Related Documents:** [`docs/04-quality-and-security/HEXSTRIKE_INTEGRATION.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/04-quality-and-security/HEXSTRIKE_INTEGRATION.md)

### Context
HexStrike-AI is an existing penetration testing and tool execution framework installed in the development environment. We must define whether HexStrike constitutes our product core or serves as an auxiliary worker.

### Options Considered
1. *Product Built as HexStrike Extension:* Build our product directly inside HexStrike's codebase.
2. *HexStrike as Subordinate Execution Engine (Selected):* Build our own proprietary Control Plane; treat HexStrike strictly as an isolated execution provider.

### Decision
Domain-Vihaan_X owns its proprietary intelligence, graph model, risk scoring, AI prompting, and UI. HexStrike-AI is relegated strictly to an underlying execution component accessed via a validated adapter.

### Rationale
Ensures independent intellectual property, modularity, and shields the control plane from security risks and breaking changes in HexStrike.

---

## ADR-004: Restricted Scanner Adapter and Isolated Execution Model

- **Date:** 2026-11-14
- **Status:** `ACCEPTED`
- **Decision Owner:** Security & Backend Lead
- **Related Documents:** [`docs/04-quality-and-security/SECURITY_MODEL.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/04-quality-and-security/SECURITY_MODEL.md)

### Context
Security tools frequently require shell execution, which exposes platforms to command injection vulnerabilities if user inputs are concatenated directly into command lines.

### Options Considered
1. *Direct Shell Execution (`os.system` / `shell=True`):* Rapid to write, catastrophic security risk.
2. *Hardened Subprocess Adapter (`shell=False` + Allowlist) (Selected):* Parameterized argument arrays, canonical path allowlists, and execution timeouts.

### Decision
All CLI scanner invocations must use Python `subprocess.run(shell=False)` with frozen argument tuples, mandatory execution timeouts (60s), and strict target allowlist validation.

---

## ADR-005: SQLite in WAL Mode as Initial Hackathon Database

- **Date:** 2026-11-15 (Accepted under delegated architectural authority)
- **Status:** `ACCEPTED`
- **Decision Owner:** Backend Lead (Developer A)
- **Related Documents:** [`docs/02-architecture/DATA_MODEL.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/02-architecture/DATA_MODEL.md)

### Context
We need a robust, relational database for persisting assets, findings, assessments, and audit logs during the hackathon.

### Options Considered
1. *PostgreSQL in Docker:* Enterprise standard, but adds container orchestration overhead, background daemon dependencies, and live demo failure points (connection timeouts/container restart failures).
2. *SQLite in WAL Mode (Accepted):* Zero-configuration, zero network latency, file-backed ACID transactions, concurrent reads during writes via Write-Ahead Logging (`PRAGMA journal_mode=WAL;`), foreign-key enforcement (`PRAGMA foreign_keys=ON;`), and sub-second deterministic demo scenario resets.

### Decision
Adopt SQLite with Write-Ahead Logging (`PRAGMA journal_mode=WAL;`) and foreign keys enabled for the Hackathon MVP. Models are built using SQLAlchemy 2.0 declarative mappings to guarantee seamless PostgreSQL migration for production v1.0. Scoped deletion and reseeding ensure live records are protected during synthetic demo resets.

---

## ADR-006: React Flow (`@xyflow/react`) for Graph Visualization

- **Date:** 2026-11-14
- **Status:** `PROPOSED` (Awaiting Developer B confirmation)
- **Decision Owner:** Frontend Lead
- **Related Documents:** [`docs/02-architecture/TECHNICAL_IMPLEMENTATION.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/02-architecture/TECHNICAL_IMPLEMENTATION.md)

### Context
The Business Security Graph requires an interactive web canvas supporting custom node cards, pulsating attack-path edges, zoom/pan navigation, and node inspection clicks.

### Options Considered
1. *D3.js Force-Directed Graph:* Highly customizable, but extremely complex and time-consuming to style and bind to React state.
2. *Cytoscape.js:* Powerful, but styling HTML-rich node cards is cumbersome.
3. *React Flow / @xyflow/react (Selected Proposal):* Declarative React components, native Tailwind CSS support, robust minimap and edge animation primitives.

### Decision
Propose React Flow (`@xyflow/react`) as the interactive graph canvas library for the frontend.

---

## ADR-007: Human-Approved Remediation Workflow for Hackathon MVP

- **Date:** 2026-11-14
- **Status:** `ACCEPTED`
- **Decision Owner:** Product & Security Lead
- **Related Documents:** [`docs/01-product/PRD.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/01-product/PRD.md)

### Context
Autonomous AI agents that modify cloud infrastructure without human confirmation create unacceptable risks of downtime and data loss.

### Options Considered
1. *Fully Autonomous Remediation:* AI applies fixes immediately upon detection.
2. *Purely Advisory Reporting:* Platform displays a text suggestion; user must fix manually outside the app.
3. *Supervised Human-in-the-Loop Remediation (Selected):* Platform generates exact code diff, requires explicit human approval click, executes controlled fix, and verifies via re-scan.

### Decision
Require an auditable human approval gate (`POST /api/remediations/{id}/approve`) before any remediation action is executed.

---

## ADR-008: Deterministic Contextual Risk Scoring with AI Explanations

- **Date:** 2026-11-15
- **Status:** `ACCEPTED` (Accepted under delegated architectural authority)
- **Decision Owner:** Developer A (Backend, Security Architecture & Intelligence Lead)
- **Related Documents:** [`docs/02-architecture/TECHNICAL_IMPLEMENTATION.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/02-architecture/TECHNICAL_IMPLEMENTATION.md), [`apps/backend/app/intelligence/risk_engine.py`](file:///d:/REAL_projects/Domain-Vihaan%20X/apps/backend/app/intelligence/risk_engine.py)

### Context
LLMs are probabilistic and prone to hallucinating numerical risk scores between repeated queries. Trusting an LLM to generate numerical priority scores undermines reproducibility, regulatory auditability, and automated remediation gating.

### Decision
Calculate Contextual Risk Score (CRS) deterministically via an empirical mathematical formula. Restrict the LLM strictly to generating natural language summaries and guided explanations based on grounded evidence.

#### 1. Formula & Normalization
$$\text{CRS} = \min\left(10.0, \, \max\left(0.0, \, S_{\text{base}} \times \frac{W_{\text{crit}} \times W_{\text{env}} \times W_{\text{exp}} \times W_{\text{jewel}}}{1.15} + B_{\text{path}}\right)\right)$$

#### 2. Grounded Input Features & Weighting Rationale
- **Base Severity ($S_{\text{base}}$):** Uses verified CVSS v3 score when genuinely reported ($0.0 \le \text{CVSS} \le 10.0$).
- **Missing-Data Behavior:** When CVSS is missing (common in IaC and secret scans), uses strict severity baselines without fabricating synthetic CVSS: `CRITICAL`: 9.0, `HIGH`: 7.5, `MEDIUM`: 5.0, `LOW`: 2.5, `INFORMATIONAL`: 0.5.
- **Asset Criticality ($W_{\text{crit}}$):** `CRITICAL` ($1.25\times$), `HIGH` ($1.10\times$), `MEDIUM` ($1.00\times$), `LOW` ($0.85\times$).
- **Environment Multiplier ($W_{\text{env}}$):** `PRODUCTION` ($1.15\times$), `STAGING` ($1.00\times$), `DEVELOPMENT` ($0.85\times$).
- **Attack Surface Exposure ($W_{\text{exp}}$):** $+15\%$ multiplier ($1.15\times$) if asset is public-facing (domain, repository, web application).
- **Crown Jewel Multiplier ($W_{\text{jewel}}$):** $+20\%$ multiplier ($1.20\times$) if asset is a designated crown jewel data vault.
- **Attack Path Bonus ($B_{\text{path}}$):** $+1.50 \times \text{confidence} \times (S_{\text{base}} / 10.0)$ if the asset is an active step on an inferred attack path.
- **Asymptotic Asset Rollup:** $\text{Composite} = \min(10.0, \, \text{highest} + 0.15 \times \sum \text{remaining})$ prevents artificial runaway while penalizing vulnerability density.

#### 3. Limitations & Test Evidence
- Calibrated for software SME and SaaS hackathon demonstration; not a substitute for formal ISO 27005 risk assessment.
- Verified by 7 automated unit tests in `apps/backend/tests/test_risk_engine.py` covering boundary clamping, missing CVSS handling, environment multipliers, crown jewel scaling, and composite rollups.

---

## ADR-009: Synthetic Test Assets and Controlled Demo Scenario

- **Date:** 2026-11-14
- **Status:** `ACCEPTED`
- **Decision Owner:** Core Engineering Team
- **Related Documents:** [`docs/05-presentation/DEMO_PLAN.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/05-presentation/DEMO_PLAN.md)

### Context
Demonstrating security tools on live client environments or public web assets poses severe ethical, legal, and operational risks (e.g., accidental token revocation, unconsented scanning).

### Options Considered
1. *Live Public Repositories & Cloud Accounts:* High risk of rate-limiting, network failure, or credential leakage during live demo.
2. *Mock / Hardcoded JSON Output:* Zero credibility; easily detected as fake.
3. *Isolated Synthetic SaaS Environment (Selected):* Local test repository containing synthetic test credentials, local mock IaC Terraform files, and a mock web service running in an isolated test folder.

### Decision
Build a fully operational, isolated synthetic SaaS test environment (`test_env/mock_saas/`) containing safe, deliberate misconfigurations to serve as the ground truth for live demo scanning.

---

## ADR-010: Frontend-First Judging Experience & Five Primary UIs

- **Date:** 2026-11-15
- **Status:** `PROPOSED` (Awaiting Team Confirmation)
- **Decision Owner:** Core Engineering Team
- **Related Documents:** [`docs/01-product/PRD.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/01-product/PRD.md), [`docs/02-architecture/TECHNICAL_IMPLEMENTATION.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/02-architecture/TECHNICAL_IMPLEMENTATION.md)

### Context
Hackathon evaluation is heavily driven by the live presentation, visual clarity, and intuitive user experience. An overly complex backend with an unpolished frontend consistently loses to products with superior visual ergonomics and flawless end-to-end user journeys.

### Options Considered
1. *Backend-Heavy / Terminal-Only Tool:* Focus 90% of effort on scanner breadth and CLI outputs with a minimal Bootstrap table UI.
2. *Frontend-First Judging Architecture (Selected Proposal):* Focus on crafting five enterprise-grade, polished interfaces (Command Center, Business Security Graph, Threat Center, Path Investigation, Remediation Studio) backed by a reliable, predictable backend.

### Decision
Adopt the **Frontend-first, Backend-reliable, Demo-driven** engineering doctrine. Standardize the frontend around five cohesive cybersecurity interfaces, treating the interactive Business Security Graph as the primary visual differentiator.

### Consequences
- **Positive:** Maximum visual impact during the 6-minute evaluation pitch; communicates value immediately to judges; enforces clean component hierarchy.
- **Negative:** Requires disciplined frontend component engineering and strict contract-first mocking.

---

## ADR-011: Deterministic Demo Mode Separated from Live Assessment Mode

- **Date:** 2026-11-15
- **Status:** `PROPOSED` (Awaiting Team Confirmation)
- **Decision Owner:** Architecture & Product Lead
- **Related Documents:** [`docs/02-architecture/TECHNICAL_IMPLEMENTATION.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/02-architecture/TECHNICAL_IMPLEMENTATION.md), [`docs/02-architecture/API_CONTRACT.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/02-architecture/API_CONTRACT.md)

### Context
Live scanning during presentations is notoriously prone to network timeouts, rate limiting, and nondeterministic scanner durations. Conversely, hardcoding mock responses destroys credibility and fails real-world evaluations.

### Options Considered
1. *Live Scanning Only:* Risk of network failure or long scanner latencies (60s+) stalling the presentation.
2. *Hardcoded UI Mocks Only:* High risk of disqualification or skepticism from judges; fails real security testing.
3. *Dual Operating Mode Architecture (Selected Proposal):* Explicitly architect two modes: `DEMO_MODE` (deterministic local synthetic fixtures, zero internet/LLM dependency, one-click reset) and `LIVE_ASSESSMENT_MODE` (real tool execution with live progress).

### Decision
Propose dual operating modes clearly distinguished throughout the API and UI. Implement `POST /api/demo/reset` to allow instantaneous reset and repeatable demonstrations from a clean state.

### Consequences
- **Positive:** 100% demo stability with zero internet dependency; clear separation between demonstration and production execution; protects truth in evidence.
- **Negative:** Requires maintaining the synthetic scenario provider alongside live scanner orchestration logic.

---

## ADR-012: Graceful Backend Degradation & Independence from External LLM Services

- **Date:** 2026-11-15
- **Status:** `PROPOSED` (Awaiting Team Confirmation)
- **Decision Owner:** Backend & Security Lead
- **Related Documents:** [`docs/04-quality-and-security/SECURITY_MODEL.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/04-quality-and-security/SECURITY_MODEL.md), [`docs/04-quality-and-security/HEXSTRIKE_INTEGRATION.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/04-quality-and-security/HEXSTRIKE_INTEGRATION.md)

### Context
External LLM APIs (OpenAI, Anthropic, Gemini) can experience latency spikes (> 10s), rate limits, or connectivity failures. External execution engines like HexStrike-AI may not be running on every evaluator workstation.

### Options Considered
1. *Hard External Dependencies:* Fail with 500 error if LLM API or HexStrike is unreachable.
2. *Graceful Degradation with Embedded Fallbacks (Selected Proposal):* Decouple all critical flows from external services. If the LLM is slow or offline, an embedded deterministic rule engine generates the risk narrative. If HexStrike is unavailable, native CLI tools execute seamlessly.

### Decision
Propose that the Control Plane must never fail or crash due to external service unavailability. Embedded rule-based analysis acts as an instantaneous offline fallback.

### Consequences
- **Positive:** Zero risk of demo failure due to wifi drops or API rate limits; robust software engineering.
- **Negative:** Requires maintaining rule-based synthesis templates in addition to LLM prompt templates.

---

## ADR-013: Evidence Provenance & Transparent Representation of Simulated Findings

- **Date:** 2026-11-15
- **Status:** `PROPOSED` (Awaiting Team Confirmation)
- **Decision Owner:** Quality & Architecture Lead
- **Related Documents:** [`AGENTS.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/AGENTS.md), [`docs/01-product/PRD.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/01-product/PRD.md)

### Context
Ethical cybersecurity engineering requires absolute transparency regarding finding provenance. Passing off simulated data as verified scanner output or presenting an inferred attack path as an empirically confirmed exploit is unacceptable.

### Options Considered
1. *Undifferentiated Findings:* Display all findings identically regardless of source.
2. *Explicit Provenance Tagging (Selected Proposal):* Every finding, node, and relationship carries a mandatory `provenance` field (`SIMULATED_DEMO`, `SCANNER_VERIFIED`, `CONFIG_DERIVED`, `INFERRED_PATH`).

### Decision
Enforce explicit provenance tagging in all database schemas, API responses, and UI badges. Simulated demo findings are clearly marked with `[SIMULATED]`; real scanner outputs display tool execution logs and exit codes.

### Consequences
- **Positive:** Complete intellectual honesty; evaluators can verify exact provenance; complies strictly with cybersecurity governance.
- **Negative:** Requires UI badges and state management across all five interfaces.

---

## ADR-014: Grounded AI Analysis, Human-Approved Patch Execution, and Reassessment Verification Loop

- **Date:** 2026-11-15
- **Status:** `ACCEPTED` (Accepted under delegated architectural authority)
- **Decision Owner:** Developer A (Backend, Security Architecture & Integration Lead)
- **Related Documents:** [`docs/02-architecture/TECHNICAL_IMPLEMENTATION.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/02-architecture/TECHNICAL_IMPLEMENTATION.md), [`docs/04-quality-and-security/SECURITY_MODEL.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/04-quality-and-security/SECURITY_MODEL.md), [`contracts/openapi/openapi.yaml`](file:///d:/REAL_projects/Domain-Vihaan%20X/contracts/openapi/openapi.yaml)

### Context
Autonomous security remediation poses severe operational risks: unvetted infrastructure changes can cause service outages, permission lockouts, or syntax corruption. Furthermore, relying on ungrounded probabilistic LLMs to propose remediation code risks hallucinated commands, syntax errors, and unverifiable claims of exploit mitigation.

### Options Considered
1. *Unsupervised Autonomous Remediation:* AI agent directly applies patches and triggers CI/CD without human intervention (Rejected: Violates core security principle of human supervision; unacceptable blast radius).
2. *Purely Textual Remediation Guidance:* Displaying static markdown advice without executable patches (Rejected: Leaves heavy cognitive and manual burden on developers; slow time-to-remediate).
3. *Supervised Human-in-the-Loop Remediation with Grounded Fallbacks & Reassessment Loop (Selected):*
   - Generate standard unified diffs (`--- a/file +++ b/file`) with context matching.
   - Enforce mandatory human approval gate (`status="PENDING"` -> human approval -> `status="APPLIED"`).
   - Atomic file modification with `.bak` backup and automatic rollback on error.
   - Deterministic rule-based analysis fallback (< 50ms) to ensure 100% demo uptime and zero hallucination.
   - Post-patch verification loop to confirm vulnerability eradication, mark findings `RESOLVED`, and mark attack paths `MITIGATED`.

### Decision
1. **Grounded AI Analysis (TSK-015):** Provide `POST /api/v1/ai/analyze/{path_id}` backed by `AISecurityAnalyst`. When external LLM is offline or times out (> 5s), fallback seamlessly to `RuleBasedFallbackEngine`, producing structured kill-chain narratives, evidence citations, and choke-point mitigations in < 50ms with `grounded=True`.
2. **Standard Unified Diffs (TSK-018):** Use Python `difflib` in `UnifiedDiffEngine` to produce canonical unified diffs and rollback diffs consumable by standard diff visualizers.
3. **Atomic Human Gate (TSK-019):** Gate execution behind `POST /api/v1/remediations/{id}/approve`. Create an atomic backup (`.bak`) before touching any file on disk. If patching fails, automatically restore the original file and log a security audit event.
4. **Automated Verification Loop (TSK-020):** Implement `POST /api/v1/remediations/{id}/verify`. Parse target files to confirm the vulnerability has been removed, update the finding status to `RESOLVED`, and mark the associated attack path as `MITIGATED`.

### Consequences
- **Positive:** Zero risk of unintended automated outages; complete transparency for developer review; robust offline demo resilience; immediate closed-loop verification feedback.
- **Negative:** Requires maintaining atomic rollback file management and diff application logic within the backend.
