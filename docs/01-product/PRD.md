# Product Requirements Document (PRD) — Domain-Vihaan_X

> **Document ID:** PRD-001  
> **Project Name:** Domain-Vihaan_X  
> **Domain:** Cybersecurity (VIHAAN X Hackathon)  
> **Document Status:** PROPOSED (Updated for VIHAAN X Judging-First Strategy)  
> **Author:** Principal Product Manager & Cybersecurity Architect  
> **Last Updated:** 2026-11-15T00:20:00+05:30  
> **Target Release:** Hackathon MVP (v0.1.0)  
> **Core Strategic Philosophy:** **Frontend-first. Backend-reliable. Demo-driven.**  

---

## 1. Document Purpose and Status

This Product Requirements Document (PRD) establishes the definitive contract governing the product scope, functional specifications, non-functional constraints, and user experience for **Domain-Vihaan_X**. 

### Strategic Development Philosophy Revision
The platform is evaluated primarily on its live product demonstration, visual coherence, and architectural clarity during the VIHAAN X Hackathon. Consequently, the team adopts a **Frontend-first, Backend-reliable, Demo-driven** engineering doctrine:
- **Frontend-first:** The frontend experience must be exceptionally polished, responsive, visually compelling, and intuitive, built around the signature **Business Security Graph** and five cohesive primary interfaces.
- **Backend-reliable:** The backend must be rock-solid, predictable, and resilient under degraded conditions (offline mode, scanner timeout, missing external LLM, or HexStrike unavailability).
- **Demo-driven:** All development prioritizes completing an unshakeable end-to-end vertical slice that can be demonstrated and repeated at least twice from a clean initial state without manual intervention.

---

## 2. Product Overview

**Domain-Vihaan_X** is a unified cybersecurity intelligence platform engineered specifically for software SMEs, high-growth SaaS startups, and software development agencies. 

Unlike conventional vulnerability scanners that produce disjointed lists of flaws, Domain-Vihaan_X synthesizes multi-source telemetry from Application Security (AppSec), Infrastructure Security (InfraSec), and External Attack Surface Management (EASM). It constructs an interactive **Business Security Graph** that connects asset relationships, models multi-stage attack paths, prioritizes risks contextually, and enables human-supervised, verifiable remediation.

---

## 3. Executive Summary

Software startups and development agencies operate across disparate environments: GitHub repositories, NPM/PyPI dependencies, AWS/GCP cloud configurations, Docker/Kubernetes workloads, and public-facing DNS/APIs. They face two severe dilemmas:
1. **Tool Overload & Alert Fatigue:** Running Gitleaks, Trivy, Checkov, and network scanners produces disjointed CSV/JSON outputs containing hundreds of alerts without context.
2. **Missing Attack-Path Intelligence:** A leaked developer API token in a staging repository may look like a "Medium" risk in isolation; however, if that token grants write access to an AWS S3 bucket holding production database backups exposed to the internet, it forms a catastrophic, business-critical attack path.

Domain-Vihaan_X solves this by correlating findings across these domains into a unified property graph, illustrating the exact kill chain from internet ingress to business impact, and providing one-click, verified remediations.

---

## 4. Background and Context

Historically, enterprise-grade Security Information and Event Management (SIEM), Cloud Security Posture Management (CSPM), and Attack Surface Management (ASM) platforms (e.g., Wiz, Orca, Palo Alto Prisma Cloud) cost tens of thousands of dollars annually and require specialized Security Operations Center (SOC) teams to operate.

Conversely, small software businesses rely on sporadic open-source CLI tools or free-tier GitHub alerts. These tools operate in total silos:
- Dependency scanners do not know which cloud containers run the vulnerable code.
- Cloud posture scanners do not know which git commit introduced an overly permissive IAM role.
- External port scanners do not know which internal database cluster an exposed service connects to.

Domain-Vihaan_X bridges this gap by democratizing graph-based security intelligence for resource-constrained engineering teams.

---

## 5. Problem Statement

Small-to-medium software enterprises (SMEs) and digital agencies cannot effectively secure their businesses because:
1. **Security Findings are Fragmented:** Findings are scattered across code linters, secret scanners, cloud dashboards, and external host scans.
2. **Relationships are Invisible:** Teams cannot visualize how assets connect (e.g., repository `repo-api` builds container `api:v1`, which assumes role `arn:aws:iam::role/AppRole` that accesses bucket `s3://prod-backups`).
3. **Prioritization is Context-Blind:** Traditional CVSS scores evaluate vulnerabilities in a vacuum, ignoring actual network exposure, IAM privileges, and data sensitivity.
4. **Remediation is Risky and Unverified:** Developers hesitate to modify IAM policies or infrastructure configurations for fear of breaking production, and they lack automated means to verify whether a change actually severed the exploit vector.

---

## 6. Problem Evidence and Supporting Research

- **Verizon Data Breach Investigations Report (DBIR 2024):** Stolen credentials and misconfigured cloud assets account for over 50% of unauthorized access incidents in cloud environments.
- **GitGuardian State of Secrets Sprawl (2024):** Over 12.8 million secrets were leaked on public GitHub in 2023 alone; developers frequently leak credentials linking test environments directly to shared infrastructure.
- **Cost of Alert Fatigue (IDC Research):** Security and DevOps engineers spend upwards of 25% of their working hours chasing false positives and cross-referencing alerts across separate administrative consoles.

---

## 7. Target Market

The platform deliberately focuses on lean, software-centric organizations:
1. **High-Growth SaaS Startups (5–50 engineers):** Developing cloud-native applications with rapid CI/CD cycles, managing AWS/GCP/Azure environments without a full-time Chief Information Security Officer (CISO).
2. **Software Development Agencies:** Managing dozens of disparate client codebases, staging environments, and client cloud credentials simultaneously.
3. **Small Software Product Businesses:** Focused on shipping code rapidly while requiring compliance readiness (SOC2, ISO 27001) and security assurance for enterprise client sales.

*Out of Scope for Target Market:* Traditional non-tech brick-and-mortar MSMEs, large enterprise defense contractors with dedicated 24/7 SOC teams.

---

## 8. Primary User Personas

### Persona 1: Alex — The SaaS Founder / CTO
- **Role:** Co-Founder & CTO at a 15-person B2B SaaS startup.
- **Needs:** High-level visibility into catastrophic business risks, compliance posture assurance, clear remediation paths that don't stall feature development.
- **Pain Point:** Terrified that a leaked test key or open cloud bucket will result in a data breach that destroys customer trust.

### Persona 2: Priya — The Software Engineering Lead
- **Role:** Lead Backend & DevOps Engineer.
- **Needs:** Unified dashboard showing actionable vulnerabilities, exact file paths, IAM policy diffs, and proof of fix.
- **Pain Point:** Overwhelmed by raw scanner logs; spends hours manually checking if a reported CVE in a container is actually reachable from the internet.

### Persona 3: Marcus — The Development Agency Security Operator
- **Role:** Solutions Architect managing multiple client projects.
- **Needs:** Isolated tenant assessments, rapid attack-surface discovery across client domains, and exportable remediation evidence for client reporting.
- **Pain Point:** Clients introduce security regressions in their repositories without warning.

---

## 9. User Pain Points Matrix

| Pain Point | Current Workaround | Impact on Business | Domain-Vihaan_X Solution |
| :--- | :--- | :--- | :--- |
| **Siloed Scanner Output** | Exporting CSVs from Trivy, Gitleaks, and AWS console into Google Sheets. | Wasted engineering time; critical issues missed in spreadsheet noise. | Unified Finding Schema ingesting and normalizing all findings automatically. |
| **Unknown Attack Paths** | Mental guesswork during post-mortems or sprint retrospectives. | Catastrophic breaches through multi-hop privilege escalation. | Interactive Business Security Graph mapping multi-stage attack paths. |
| **Fear of Remediation** | Leaving permissive `*` IAM policies untouched because "it works." | Permanent high-risk exposure of cloud storage and databases. | Contextual remediation recommendations with human approval and automated reassessment. |

---

## 10. Product Vision & Operating Modes

### 10.1 Dual Operating Mode Architecture

To reconcile the demands of a high-stakes hackathon demonstration with real-world cybersecurity capabilities, Domain-Vihaan_X incorporates two operating modes:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DOMAIN-VIHAAN_X OPERATING MODES                 │
├───────────────────────────────────┬────────────────────────────────────┤
│ 1. DEMO MODE (Default / Evaluation│ 2. LIVE ASSESSMENT MODE            │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Deterministic synthetic test env│ • Real authorized scanner execution│
│ • Preconfigured assets & scenario │ • Live Gitleaks, Checkov, Trivy    │
│ • Reproducible seeded findings    │ • Dynamic target discovery         │
│ • Zero external LLM dependency    │ • Real-time progress & partial logs│
│ • Zero internet access dependency │ • Scanner availability detection   │
│ • One-click reset to clean state  │ • Real timeouts and failure alerts │
│ • Explicit [SIMULATED] labels     │ • Verified source provenance badges│
└───────────────────────────────────┴────────────────────────────────────┘
```

The active mode is prominently visible in the global navigation bar (`[DEMO MODE: SYNTHETIC SAAS]` vs `[LIVE ASSESSMENT: PRODUCTION SCOPE]`). Simulated findings and seeded topology edges are explicitly labeled throughout all views to guarantee absolute truth in evidence.

---

## 11. The Five Primary Frontend Interfaces

The user experience centers around five primary interfaces designed to enterprise-grade cybersecurity standards:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FIVE PRIMARY FRONTEND INTERFACES                │
├───────────────────────────────────┬────────────────────────────────────┤
│ 1. Security Command Center        │ Executive posture cockpit, aggregate│
│                                   │ risk velocity, asset breakdown, and│
│                                   │ one-click demo scenario reset.     │
├───────────────────────────────────┼────────────────────────────────────┤
│ 2. Business Security Graph        │ SIGNATURE VISUAL FEATURE: Full     │
│                                   │ interactive React Flow canvas with │
│                                   │ custom asset & finding nodes, node │
│                                   │ inspector, and pulsing kill chains.│
├───────────────────────────────────┼────────────────────────────────────┤
│ 3. Threat and Findings Center     │ High-density tabular triage center │
│                                   │ with severity filtering, provenance│
│                                   │ badges, and raw evidence drawers.  │
├───────────────────────────────────┼────────────────────────────────────┤
│ 4. Attack Path Investigation      │ In-depth kill-chain inspection     │
│                                   │ drawer with hop-by-hop breakdown,  │
│                                   │ choke-point math, and risk vectors.│
├───────────────────────────────────┼────────────────────────────────────┤
│ 5. AI Remediation Center          │ Interactive remediation studio with│
│                                   │ code diff previews, human approval │
│                                   │ modal, and live verification rescan│
└───────────────────────────────────┴────────────────────────────────────┘
```

### Visual & Aesthetic Guidelines
- **Cybersecurity Aesthetics:** Dark mode palette with deep slates (`#0B0F17`, `#111827`), high-contrast borders (`#1F2937`), and crisp contextual accents (Emerald for safe, Amber for medium, Rose/Crimson for critical).
- **Typography:** Refined monospace accents (`JetBrains Mono` / `Fira Code`) for locators, hashes, and diffs; modern geometric sans-serif (`Inter`) for UI elements.
- **Restrained Motion:** Subtle status indicator pulses, smooth canvas transitions; zero distracting ornamental animations.
- **Robust States:** Fully styled empty states ("No attack paths detected"), realistic loading skeletons, and explanatory error states with recovery triggers.

---

## 12. Backend Resilience & Graceful Degradation Strategy

The backend Control Plane is architected to remain stable under all adverse evaluation conditions:

| Adverse Condition | Failure Handling & Degradation Behavior |
| :--- | :--- |
| **HexStrike Unreachable** | Gracefully logs warning; continues 100% of core operations using native CLI runners and cached scenario fixtures. |
| **Scanner CLI Failure / Missing** | Captures subprocess error code; records `ScanExecution(status=FAILED)`; displays warning badge without crashing API. |
| **External LLM Timeout / Disconnect**| Automatically routes prompt to embedded deterministic rule-based synthesis engine; returns validated narrative instantly. |
| **Network Disconnection** | Operates entirely on `127.0.0.1` localhost with SQLite; requires zero external internet calls in Demo Mode. |
| **Malformed Tool Output** | Normalizer quarantines invalid JSON, logs raw payload, and proceeds to normalize remaining tool outputs. |
| **Interrupted Assessment** | Database marks incomplete execution as `INTERRUPTED`; allows clean restart via API or UI button. |
| **Browser Refresh During Scan** | Polling hook automatically resumes tracking scan progress from persisted SQLite database state. |
| **Failed Remediation Re-scan** | If fix does not eliminate finding, platform displays `REMEDIATION_INCOMPLETE`, keeps attack path active, and alerts user. |

---

## 13. Scope Definitions

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LONG-TERM VISION (2027+)                        │
│ Autonomous agentic remediation, real-time eBPF runtime monitoring,     │
│ multi-cloud IAM graph, compliance automation (SOC2/HIPAA), dark web OSINT│
├────────────────────────────────────────────────────────────────────────┤
│                       FUTURE ROADMAP (v0.2 - v1.0)                     │
│ Multi-tenant SaaS, GitHub App CI/CD bot, AWS CloudTrail ingestion,     │
│ Jira/Slack integration, custom policy language (Rego/OPA)              │
├────────────────────────────────────────────────────────────────────────┤
│                     HACKATHON MVP (v0.1.0 - LOCKED)                    │
│ Dual Operating Modes (Demo Mode + Live Assessment Mode)                │
│ Five Primary Interfaces (Command Center, Graph, Threats, Attack Paths, │
│ AI Remediation Center) + NetworkX Engine + Offline Deterministic AI    │
│ Human Approval Gate + Automated Reassessment Verification + Reset Loop │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 14. Functional Requirements (FR)

### Asset, Assessment & Mode Management

| ID | Title | Priority | Description | Acceptance Criteria | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-001** | Business Asset Registration | **P0** | Register digital assets across supported types (`REPOSITORY`, `CLOUD_STORAGE`, `IAM_ROLE`, `DOMAIN`, `WEB_SERVICE`). | User can register assets via API/UI with environment and criticality tags. | PROPOSED |
| **FR-002** | Security Assessment Initiation | **P0** | Initiate orchestrated security scans against registered, authorized assets. | Background job triggers; state transitions (`PENDING` -> `RUNNING` -> `COMPLETED`). | PROPOSED |
| **FR-003** | Scanner Orchestration | **P0** | Execute specialized CLI tools (Gitleaks, Checkov, Trivy, Subfinder) via isolated subprocess adapters. | Subprocess executes safely with 60s timeout, `shell=False`, and exit-code trapping. | PROPOSED |
| **FR-017** | Operating Mode Selection | **P0** | Provide explicit toggle between `DEMO_MODE` and `LIVE_ASSESSMENT_MODE`. | Global header displays active mode; simulated data is explicitly marked throughout the UI. | PROPOSED |
| **FR-018** | One-Click Demo Reset | **P0** | Enable one-click initialization and reset of the synthetic demo scenario. | `POST /api/demo/reset` cleans database, restores mock files, and resets graph in < 2 seconds. | PROPOSED |

### Finding Normalization & Graph Engine

| ID | Title | Priority | Description | Acceptance Criteria | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-004** | Finding Schema Normalization | **P0** | Parse tool outputs into uniform `FindingSchema` models with explicit evidence provenance. | Gitleaks, Checkov, and Trivy outputs normalized; unmapped fields preserved in `raw_data`. | PROPOSED |
| **FR-005** | Asset Relationship Management | **P0** | Maintain directed operational relationships between assets (`DEPLOYS_TO`, `ASSUMES_ROLE`, etc.). | Relationships ingested from manifests or declared via API; provenance tagged (`SEEDED` vs `VERIFIED`). | PROPOSED |
| **FR-006** | Business Security Graph Model | **P0** | Assemble assets, findings, and relationships into an in-memory directed property graph. | NetworkX graph instantiated; serializable to React Flow JSON format. | PROPOSED |
| **FR-007** | Cross-Domain Attack-Path Correlation | **P0** | Algorithmic DFS traversal identifying multi-hop exploit paths from ingress to high-value assets. | Traversal identifies cross-domain paths, flags intermediate choke points, and computes hop count. | PROPOSED |

### Risk Scoring, AI Analysis & Remediation

| ID | Title | Priority | Description | Acceptance Criteria | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-008** | Context-Aware Risk Prioritization | **P0** | Deterministic multi-factor scoring (0.0–10.0) combining CVSS, asset criticality, exposure, and path depth. | Formula execution is 100% reproducible; findings on attack paths receive $+2.0$ path bonus. | PROPOSED |
| **FR-009** | Evidence-Grounded AI Analysis | **P0** | Natural language kill-chain explanation with mandatory offline deterministic rule fallback. | Explains attack path in plain English; falls back to deterministic rule template if LLM is offline. | PROPOSED |
| **FR-010** | Remediation Recommendation Generation | **P0** | Generate concrete, actionable code diffs and configuration patches for detected choke points. | Action includes title, description, unified diff preview, and target file locator. | PROPOSED |
| **FR-011** | Human-in-the-Loop Approval Gate | **P0** | Require explicit human confirmation before executing any remediation action. | State transitions to `APPROVED` with user ID, rationale, and timestamp; zero unapproved actions. | PROPOSED |
| **FR-012** | Remediation Verification Reassessment | **P0** | Automated targeted re-scan triggered upon patch execution to verify vulnerability resolution. | Re-scan clears finding, severs graph attack edge, and transitions path status to `SEVERED`. | PROPOSED |

### Primary Frontend Interfaces

| ID | Title | Priority | Description | Acceptance Criteria | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-013** | Security Command Center | **P0** | Executive cockpit displaying overall posture score, risk velocity, asset breakdown, and quick scan controls. | Responsive KPI cards, active attack-path banner, and one-click demo scenario reset button. | PROPOSED |
| **FR-014** | Business Security Graph Canvas | **P0** | Interactive React Flow canvas rendering asset/finding nodes, edge types, and pulsating attack chains. | Interactive node dragging, zoom/pan controls, node inspection drawer, and path highlight toggle. | PROPOSED |
| **FR-015** | Threat & Findings Center | **P0** | Tabular findings triage view with severity filters, category tags, and provenance badges. | High-density data table supporting keyword search, sorting, and raw evidence inspection drawer. | PROPOSED |
| **FR-016** | Attack Path Investigation Drawer | **P0** | Step-by-step kill chain walkthrough displaying asset transitions, choke point, and risk factors. | Detail drawer shows exact hop sequence, technical evidence, and trigger button for AI explanation. | PROPOSED |
| **FR-019** | AI Remediation Center Studio | **P0** | Dedicated remediation interface with unified diff viewer, approval modal, and verification status animation. | Displays side-by-side or unified code diff, approval confirmation dialog, and live re-scan progress. | PROPOSED |

---

## 15. Non-Functional Requirements (NFR)

| ID | Category | Specification | Measurement / Verification |
| :--- | :--- | :--- | :--- |
| **NFR-001** | UI Performance | React Flow canvas must render up to 100 nodes and 150 edges smoothly at 60 FPS without layout lag. | Chrome DevTools Performance profile. |
| **NFR-002** | Scan Execution | Local test scan execution (Gitleaks, Checkov) must complete in < 20s for the synthetic demo repository. | Execution timer logged in `ScanExecution`. |
| **NFR-003** | Resilience | Backend must degrade gracefully without 500 errors when external LLM or HexStrike are unreachable. | Integration test with mocked network dropouts. |
| **NFR-004** | Usability | An evaluator viewing the dashboard must understand the primary attack path within 15 seconds. | Evaluator rehearsal testing. |
| **NFR-005** | Clean Separation | Frontend and backend must communicate strictly via documented REST JSON contracts; zero shared code. | Architectural audit. |
| **NFR-006** | Local Portability | Entire platform must run locally on developer laptops with zero external cloud dependencies. | Fresh clone installation verification. |
| **NFR-007** | Determinism | Risk scoring and graph traversal must yield identical results across repeated demo runs. | Automated test assertions. |
| **NFR-008** | Repeatability | The entire 12-stage demo flow must be repeatable at least twice from a clean initial state via reset API. | Automated demo loop test. |

---

## 16. Security and Privacy Requirements (SEC)

| ID | Requirement | Priority | Implementation Method |
| :--- | :--- | :--- | :--- |
| **SEC-001** | Target Allowlist Enforcement | **P0** | Scans strictly restricted to pre-approved local paths and authorized test domains. |
| **SEC-002** | Command Injection Immunity | **P0** | `shell=False` enforced on all subprocesses; frozen argument tuples; regex locator validation. |
| **SEC-003** | Localhost Adapter Binding | **P0** | External execution components (HexStrike-AI) bind strictly to loopback `127.0.0.1`. |
| **SEC-004** | Secret Redaction Filter | **P0** | Discovered secrets masked (`ghp_1234****abcd`) prior to database insertion or UI display. |
| **SEC-005** | Human Approval Gate | **P0** | Mandatory user consent recorded in `audit_events` before applying any remediation patch. |
| **SEC-006** | Prompt Injection Isolation | **P0** | Scanner telemetry enclosed in `<evidence>` tags; prompt strictly enforces treating evidence as passive data. |
| **SEC-007** | Truth in Provenance | **P0** | Simulated test findings explicitly labeled `[SIMULATED]` to distinguish from live scanner output. |
| **SEC-008** | Tamper-Evident Audit Trail | **P0** | Immutable append-only audit log for all assessments, approvals, and remediation actions. |

---

## 17. Updated Demonstration Acceptance Criteria (Judging Standard)

The hackathon demonstration must satisfy the following **11 mandatory criteria** and be **repeatable at least twice from a clean initial state**:

1. **Direct Entry:** Opens directly into a polished, responsive Security Command Center displaying initial posture.
2. **Coherent Information:** Displays coherent business assets, environments, and digital relationships.
3. **Assessment Initiation:** Initiates an assessment with real-time visual progress feedback.
4. **Findings Presentation:** Presents security findings across AppSec, InfraSec, and Perimeter in the Threat Center.
5. **Attack-Path Visualization:** Reveals the signature Business Security Graph with interactive nodes and pulsating red kill chain.
6. **Business Risk Explanation:** Explains clearly why the multi-hop attack path matters to the business (via grounded AI or rule fallback).
7. **Remediation Recommendation:** Generates actionable remediation recommendations and code diffs for the critical choke point.
8. **Human Approval:** Obtains explicit human approval via confirmation dialog with auditable attribution.
9. **Controlled Execution:** Applies the patch to the isolated test environment configuration.
10. **Automated Verification:** Automatically re-scans, verifies finding resolution, and visually severs the attack path on the graph.
11. **Graceful Resilience:** Continues to behave predictably and correctly if optional integrations (HexStrike, external LLM) are unavailable.
