# Domain-Vihaan_X

> **Unified Cybersecurity Intelligence Platform for Software SMEs, SaaS Startups, and Development Agencies**  
> Built for **VIHAAN X** Hackathon | **Cybersecurity Domain**  
> GitHub Repository: [`https://github.com/bhavyab212/Domain-Vihaan_X`](https://github.com/bhavyab212/Domain-Vihaan_X)

---

## 🛡️ Executive Summary

Modern software SMEs, high-growth SaaS startups, and digital development agencies operate across heavily fragmented digital footprints: source-code repositories, third-party dependencies, multi-cloud infrastructure, container clusters, DNS zones, and external web APIs. 

Traditional vulnerability scanners flood lean engineering teams with hundreds of disconnected, context-free alerts. Without dedicated security staff, teams cannot determine how an exposed repository secret, a misconfigured cloud storage bucket, and an exposed web service relate to one another or whether they combine into a lethal attack vector.

**Domain-Vihaan_X** transforms fragmented security telemetry into a unified **Business Security Graph**. By correlating cross-domain findings across **Application Security**, **Infrastructure Security**, and **External Attack Surface**, the platform maps verified digital asset relationships, identifies business-critical attack paths, provides contextual risk prioritization, and guides safe, human-approved remediation verified through automated reassessment.

---

## 🎯 The Core Product Proposition

> **"Connect fragmented security findings, understand their relationships, identify business-critical attack paths, and guide safe remediation."**

The platform answers seven fundamental questions for software engineering teams:
1. **Inventory:** What digital assets does our business actually own and operate?
2. **Detection:** What specific vulnerabilities and misconfigurations exist within those assets?
3. **Topology:** How do these assets connect to each other across application, cloud, and network boundaries?
4. **Attack-Path Correlation:** Do multiple individually "low" or "medium" findings combine into a critical multi-stage attack path?
5. **Contextual Prioritization:** Which security risks threaten business continuity, customer data, and production assets first?
6. **Remediation:** What concrete, safe actions eliminate the root vulnerability without disrupting production services?
7. **Verification:** Did the applied fix successfully sever the attack path upon automated reassessment?

---

## 🚀 Hackathon MVP Scope

The hackathon MVP delivers a fully functional, self-contained intelligence platform focused on three core security domains:

| Security Domain | Target Assets & Scope | Integrated Tooling & Execution |
| :--- | :--- | :--- |
| **1. Application Security** | Git repositories, hardcoded secrets/API keys, software dependencies (SCA), source code vulnerabilities. | Gitleaks, OSV-Scanner, Trivy, HexStrike-AI adapter. |
| **2. Infrastructure Security** | Cloud storage buckets, IAM role configurations, container configurations (Dockerfile/Kube), IaC templates. | Checkov, Trivy IaC, Prowler (targeted rules), HexStrike-AI adapter. |
| **3. External Attack Surface** | Root domains, subdomains, DNS records, SSL/TLS certificates, exposed network ports, web services. | Subfinder, Nuclei, Nmap, HexStrike-AI reconnaissance integrations. |

### Differentiator: The Business Security Graph
Unlike standalone vulnerability dashboards, Domain-Vihaan_X models digital infrastructure as a directed property graph. Nodes represent assets (Repositories, Cloud Buckets, IAM Policies, Domains, Containers) and Findings (Vulnerabilities, Leaked Secrets, Misconfigurations). Edges represent verified relationships (`DEPLOYS_TO`, `ASSUMES_ROLE`, `STORES_DATA_IN`, `EXPOSES_ENDPOINT`, `AUTHENTICATES_VIA`). Attack paths are evaluated deterministically and enriched with evidence-grounded AI reasoning.

---

## 💡 Key Platform Capabilities

1. **Business Asset Registration:** Multi-type asset cataloging with ownership and environment tagging (`production`, `staging`, `testing`).
2. **Unified Scanner Orchestration:** Coordinated execution of specialized CLI scanners and underlying security engines via an isolated execution model.
3. **Common Finding Normalization:** Transformation of heterogeneous scanner outputs into an open, unified schema (`FindingSchema`).
4. **Asset Relationship Management:** Explicit tracking of asset topologies, deployment pipelines, and access grants.
5. **Business Security Graph Visualization:** Interactive node-graph interface built with React Flow displaying topology and vulnerabilities.
6. **Cross-Domain Attack-Path Correlation:** Algorithmic identification of choke points and multi-stage exploit chains.
7. **Context-Aware Risk Prioritization:** Multi-factor scoring combining CVSS, asset criticality, exposure level, and path exploitability.
8. **Evidence-Grounded AI Analysis:** Structured security summaries explaining exploit vectors without hallucinations or ungrounded speculation.
9. **Remediation Recommendation Engine:** Actionable, code-ready mitigation proposals (IaC patches, permission restrictions, secret rotation).
10. **Human-in-the-Loop Approval:** Auditable staging workflow requiring human confirmation prior to any remediation action.
11. **Automated Reassessment Verification:** Immediate post-remediation scan to verify that vulnerability nodes and attack edges are severed.
12. **Unified Security Dashboard:** Executive metrics, risk velocity, open attack paths, and asset posture at a glance.
13. **Comprehensive Audit Trail & Evidence:** Full historical provenance, scanner logs, execution metadata, and approval stamps.

---

## 🏗️ Architecture Overview

The platform is strictly architected with a clean separation between the **Control Plane** (proprietary product intelligence, graph engine, and UI) and the **Execution Plane** (isolated scanner runners and external execution frameworks).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER / WEB BROWSER                              │
│         React 18 + TypeScript + Vite + Tailwind CSS + React Flow       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST API
┌───────────────────────────────────▼────────────────────────────────────┐
│                  CONTROL PLANE (Proprietary Core)                      │
│                Python 3.11+ / FastAPI / Pydantic V2                    │
│                                                                        │
│  ┌───────────────────────┐  ┌───────────────────────────────────────┐  │
│  │ Asset & Normalization │  │ Business Security Graph Engine        │  │
│  │ (Trivy/Gitleaks/IaC)  │  │ (NetworkX / SQLite Property Graph)    │  │
│  └───────────┬───────────┘  └───────────────────┬───────────────────┘  │
│              │                                  │                      │
│  ┌───────────▼───────────┐  ┌───────────────────▼───────────────────┐  │
│  │ Context Risk Scorer   │  │ AI Analysis & Remediation Engine      │  │
│  │ (Deterministic Model) │  │ (Grounded LLM Explanations)           │  │
│  └───────────────────────┘  └───────────────────────────────────────┘  │
│                                                                        │
│               Storage Layer: SQLite (WAL Mode) / JSONB                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Internal Localhost / Unix Socket
                                    │ (Sanitized, Parameterized Adapter)
┌───────────────────────────────────▼────────────────────────────────────┐
│                 EXECUTION PLANE (Sandboxed Workers)                    │
│                                                                        │
│   ┌─────────────────────┐  ┌──────────────────┐  ┌─────────────────┐   │
│   │ CLI Tool Runners    │  │ HexStrike-AI     │  │ Target Allowlist│   │
│   │ (Gitleaks, Checkov, │  │ Integration      │  │ Policy Enforcer │   │
│   │  Trivy, Nuclei)     │  │ (MCP / Adapter)  │  │ & Rate Limiter  │   │
│   └─────────────────────┘  └──────────────────┘  └─────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 Technology Stack

### Control Plane & Backend
- **Language:** Python 3.11+
- **API Framework:** FastAPI (high-performance async ASGI)
- **Data Validation & Schemas:** Pydantic V2
- **Database Engine:** SQLite (WAL mode for zero-overhead local development & testing; architected for easy PostgreSQL migration)
- **Graph Processing:** NetworkX (in-memory graph algorithms, cycle detection, path traversals)
- **AI Integration:** Structured LLM client with strict schema validation and grounded prompt contracts

### Presentation & Frontend
- **Framework:** React 18
- **Language:** TypeScript
- **Build Tooling:** Vite
- **Styling:** Tailwind CSS
- **Interactive Graph Visualization:** React Flow (`@xyflow/react`)
- **Iconography & Components:** Lucide React

### Execution Plane & Security Scanners
- **Secret Detection:** Gitleaks
- **Dependency & Container Scanning:** Trivy, OSV-Scanner
- **Infrastructure-as-Code (IaC) Scanning:** Checkov, Trivy IaC
- **Reconnaissance & DAST:** Subfinder, Nuclei, Nmap
- **Security Orchestration Engine:** HexStrike-AI (accessed exclusively via hardened local adapter)

---

## 👥 Team & Ownership

Developed by a dedicated 2-person engineering team for VIHAAN X:

| Role | Primary Responsibilities |
| :--- | :--- |
| **Developer A — Backend & Security Architecture** | FastAPI Control Plane, Scanner Orchestration, Normalization Engine, Business Security Graph Engine, Risk Calculation, HexStrike-AI Adapter, Test Suites. |
| **Developer B — Frontend & Product Engineering** | React/Vite UI Architecture, React Flow Interactive Graph, Findings Explorer, Remediation Approval Workflows, State Management, Demo Presentation. |
| **Shared Responsibilities** | REST API Contract design, Data Model specifications, Security Model compliance, End-to-End Integration, Final Presentation & Pitch. |

---

## 📁 Project Documentation Navigation

This repository enforces an institutional-grade documentation system. All team members and contributors must reference these documents as the single source of truth:

```
├── AGENTS.md                                   # Autonomous Agent & Antigravity Governance Protocol
├── CHANGELOG.md                                # Chronological Product & Technical Changelog
│
├── docs/01-product/
│   ├── PRD.md                                  # Product Requirements Document (FRs, NFRs, Metrics)
│   ├── PRODUCT_VISION.md                       # Strategic Vision, Market Philosophy & Hypotheses
│   └── USER_JOURNEYS.md                        # Persona Walkthroughs & Failure Mode Analysis
│
├── docs/02-architecture/
│   ├── TECHNICAL_IMPLEMENTATION.md             # In-depth Engineering Blueprint & Components
│   ├── SYSTEM_ARCHITECTURE.md                  # C4 Models, Mermaid Diagrams & Control/Execution Separation
│   ├── DATA_MODEL.md                           # Relational Entities, Property Graph & Schema Specs
│   ├── API_CONTRACT.md                         # Formal REST API Endpoint & Payload Specifications
│   └── INTEGRATIONS.md                         # Scanner Integration Architecture & Security Guardrails
│
├── docs/03-project-management/
│   ├── PROJECT_CONTEXT.md                      # Living Source of Truth (Current State, Blockers, Next Steps)
│   ├── DEVELOPMENT_LOG.md                      # Append-Only Chronological Engineering Journal
│   ├── DECISIONS.md                            # Architecture Decision Records (ADRs 001–009)
│   ├── TIMELINE.md                             # Milestone Schedules & Critical Demo Deadlines (IST)
│   ├── TEAM_OWNERSHIP.md                       # Responsibility Matrix, Interfaces & Handoff Protocols
│   └── TASK_TRACKER.md                         # Structured Task Register with Acceptance Criteria
│
├── docs/04-quality-and-security/
│   ├── TEST_PLAN.md                            # Multi-Tier Verification & Synthetic Demo Test Suite
│   ├── RISK_REGISTER.md                        # Project & Security Risk Matrix with Mitigations
│   ├── SECURITY_MODEL.md                       # Threat Model, Input Sanitization & Human-in-the-Loop
│   └── HEXSTRIKE_INTEGRATION.md                # Hardened Adapter Specs, Known CVE Analysis & Sandboxing
│
└── docs/05-presentation/
    ├── DEMO_PLAN.md                            # Scripted 12-Stage Live Demo Scenario & Failure Recovery
    └── PITCH_OUTLINE.md                        # VIHAAN X Presentation Narrative & Judge Rubric Alignment
```

---

## 🚦 Project Status

- **Current Stage:** Pre-development / Architecture & Documentation Phase
- **Repository Commit Baseline:** `bafab7b6a4891024690c8f64b7a4b631e9e5b6f3` (`main`)
- **Active Focus:** Formal documentation sign-off, API contract validation, and synthetic demonstration environment staging.
- **Application Code Status:** Locked pending explicit architecture approval as mandated by [`AGENTS.md`](AGENTS.md).

---

## ⚙️ Development Setup (Preview)

*Full setup instructions and automated container compose scripts will be finalized during Phase 1 of application scaffolding.*

### Prerequisites
- Node.js 18+ & npm
- Python 3.11+ & virtualenv (`venv` or `uv`)
- Git
- Docker / Podman (recommended for scanner tool isolation)

```bash
# Clone the repository
git clone https://github.com/bhavyab212/Domain-Vihaan_X.git
cd Domain-Vihaan_X

# Backend setup (preview)
cd backend
python -m venv venv
source venv/bin/activate  # Or `.\venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend setup (preview)
cd ../frontend
npm install
npm run dev
```

---

## ⚖️ License & Ethical Boundaries

This software is designed exclusively for authorized defensive cybersecurity assessments, risk posture evaluation, and internal enterprise security intelligence. All scanning modules and integration adapters require explicit asset authorization and adhere to responsible disclosure principles.
