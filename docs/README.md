# Domain-Vihaan_X Documentation System

> **Project:** Domain-Vihaan_X  
> **Repository:** `https://github.com/bhavyab212/Domain-Vihaan_X`  
> **Status:** ACTIVE & MANDATORY SOURCE OF TRUTH  
> **Standard:** ISO/IEC/IEEE 26515 & Antigravity Engineering Protocol

---

## 1. Documentation Organization

All engineering, product, architectural, and quality decisions are formally documented in the 5 canonical subsystems below:

| Directory | Subsystem | Description & Key Files |
| :--- | :--- | :--- |
| [`01-product/`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/01-product/) | **Product & Vision** | Product Requirements ([`PRD.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/01-product/PRD.md)), Long-Term Vision ([`PRODUCT_VISION.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/01-product/PRODUCT_VISION.md)), User Personas ([`USER_JOURNEYS.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/01-product/USER_JOURNEYS.md)) |
| [`02-architecture/`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/02-architecture/) | **Technical Architecture** | Blueprint ([`TECHNICAL_IMPLEMENTATION.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/02-architecture/TECHNICAL_IMPLEMENTATION.md)), C4 Diagrams ([`SYSTEM_ARCHITECTURE.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/02-architecture/SYSTEM_ARCHITECTURE.md)), Schema ([`DATA_MODEL.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/02-architecture/DATA_MODEL.md)), REST Contracts ([`API_CONTRACT.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/02-architecture/API_CONTRACT.md)), Integrations ([`INTEGRATIONS.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/02-architecture/INTEGRATIONS.md)) |
| [`03-project-management/`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/03-project-management/) | **Governance & Execution** | Living Context ([`PROJECT_CONTEXT.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/03-project-management/PROJECT_CONTEXT.md)), Task Tracker ([`TASK_TRACKER.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/03-project-management/TASK_TRACKER.md)), Team Roles ([`TEAM_OWNERSHIP.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/03-project-management/TEAM_OWNERSHIP.md)), Decisions ([`DECISIONS.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/03-project-management/DECISIONS.md)), Dev Log ([`DEVELOPMENT_LOG.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/03-project-management/DEVELOPMENT_LOG.md)) |
| [`04-quality-and-security/`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/04-quality-and-security/) | **Quality & Security** | Threat Modeling ([`SECURITY_MODEL.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/04-quality-and-security/SECURITY_MODEL.md)), HexStrike Adapter Gate ([`HEXSTRIKE_INTEGRATION.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/04-quality-and-security/HEXSTRIKE_INTEGRATION.md)), Verification Plan ([`TEST_PLAN.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/04-quality-and-security/TEST_PLAN.md)), Risk Matrix ([`RISK_REGISTER.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/04-quality-and-security/RISK_REGISTER.md)) |
| [`05-presentation/`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/05-presentation/) | **Presentation & Demo** | 12-Step Live Demo Walkthrough ([`DEMO_PLAN.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/05-presentation/DEMO_PLAN.md)), Hackathon Pitch Strategy ([`PITCH_OUTLINE.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/05-presentation/PITCH_OUTLINE.md)) |

---

## 2. Monorepo Directory Mapping

The documentation directly maps to the physical monorepo workspace as follows:

```
Domain-Vihaan_X/
├── AGENTS.md                                # Permanent Agent Governance Protocol
├── CONTRIBUTING.md                          # Branching & PR Guidelines
├── apps/
│   ├── frontend/                            # Developer B: React + Tailwind + React Flow
│   └── backend/                             # Developer A: FastAPI + NetworkX + Orchestration
├── contracts/                               # Joint: OpenAPI 3.1 & JSON Schemas
├── data/
│   ├── demo/                                # Canonical Synthetic Demo Fixtures
│   └── runtime/                             # Local SQLite DB & Sandbox Scratch
├── docs/                                    # This documentation system
├── infra/                                   # Local Docker & Dev Infrastructure
├── scripts/                                 # Setup, Demo, and Validation Scripts
└── tests/                                   # Cross-tier Contract, E2E, and Demo Tests
```
