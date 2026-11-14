# Project Living Context & Working Memory — Domain-Vihaan_X

> **Document ID:** CTX-001  
> **Project Name:** Domain-Vihaan_X  
> **Domain:** Cybersecurity (VIHAAN X Hackathon)  
> **Status:** ACTIVE LIVING DOCUMENT (Single Source of Truth)  
> **Last Updated:** 2026-11-15T00:57:00+05:30  
> **Baseline Commit:** `5a93ed7fa033f2829a14e66a4046fe77dfbaf39f` (`main`)  
> **Current Strategic Doctrine:** **Frontend-first. Backend-reliable. Demo-driven.**  

---

## 1. Project Identity & Overview

- **Project Name:** Domain-Vihaan_X
- **Event:** VIHAAN X Hackathon
- **Domain:** Cybersecurity / Security Intelligence
- **Repository:** [`https://github.com/bhavyab212/Domain-Vihaan_X`](https://github.com/bhavyab212/Domain-Vihaan_X)
- **Tagline:** Unified Cybersecurity Intelligence Platform for Software SMEs, SaaS Startups, and Development Agencies.
- **Core Proposition:** Connect fragmented security findings, understand their relationships, identify business-critical attack paths, and guide safe, verified remediation.

---

## 2. Current Project Objective

Implement deterministic synthetic SaaS scenario restoration, isolated runtime workspace management, scoped SQLite WAL database reseeding, and the canonical reset endpoint `POST /api/v1/demo/reset` on stacked branch `backend/TSK-002-demo-reset`.

---

## 3. Current Development Phase

- **Current Phase:** **Phase 2 — Core Engine & Interface Development (TSK-002 Reset API In Review; TSK-003 Foundation In Review)**
- **Active Task Branch:** `backend/TSK-002-demo-reset` (stacked on `backend/TSK-003-foundation`)
- **Next Phase:** **TSK-005: Finding Normalization Engine (`FindingSchema`)**

---

## 4. Current MVP Scope & Architecture Strategy

### Strategic Doctrine: Frontend-first, Backend-reliable, Demo-driven
- **Frontend Priority:** Deliver five exceptionally polished, enterprise-grade cybersecurity interfaces:
  1. **Security Command Center** (Posture score, risk velocity, one-click demo reset).
  2. **Business Security Graph** (Signature React Flow visual canvas, pulsating red attack edges, node inspector).
  3. **Threat & Findings Center** (High-density triage, category filtering, evidence drawers).
  4. **Attack Path Investigation** (Hop-by-hop kill chain breakdown, choke-point analysis).
  5. **AI Remediation Center** (Unified diff viewer, human approval modal, live verification re-scan).
- **Dual Operating Modes:**
  - **Demo Mode:** Deterministic synthetic test environment (`data/demo/mock_saas/`), preconfigured assets, zero external LLM dependency, zero internet dependency, one-click reset API (`POST /api/v1/demo/reset`), explicit `[SIMULATED_DEMO]` provenance.
  - **Live Assessment Mode:** Real authorized scanner execution (Gitleaks, Checkov, Trivy, Subfinder), live progress streaming, partial-result preservation, and scanner availability diagnostics.
- **Backend Reliability & Resilience:**
  - Decoupled from external LLM availability via embedded deterministic rule-based AI engine (`apps/backend/app/ai/rule_fallback.py`).
  - Decoupled from HexStrike availability via direct native CLI subprocess runners.
  - SQLite in Write-Ahead Logging (WAL) mode for zero-overhead local ACID transactions and instant resets (`data/runtime/vihaan_x.db`).

---

## 5. Accepted vs. Proposed Architecture

### Formally Accepted Decisions
- **ADR-001:** Narrow Hackathon MVP to Three Specific Security Domains (`ACCEPTED`).
- **ADR-002:** Business Security Graph as Primary Competitive Differentiator (`ACCEPTED`).
- **ADR-003:** HexStrike-AI as an Underlying Execution Component, Not Core Intelligence (`ACCEPTED`).
- **ADR-004:** Restricted Scanner Adapter and Isolated Execution Model (`ACCEPTED`).
- **ADR-005:** SQLite in WAL Mode as Initial Hackathon Database (`ACCEPTED` under delegated architectural authority).
- **ADR-007:** Human-Approved Remediation for Hackathon MVP (`ACCEPTED`).
- **ADR-009:** Synthetic Test Assets and Controlled Demonstration Scenario (`ACCEPTED`).

### Proposed Architecture Awaiting Formal Approval
- **ADR-006:** React Flow (`@xyflow/react`) for Graph Visualization (`PROPOSED`).
- **ADR-008:** Deterministic Contextual Risk Scoring with Structured LLM Explanations (`PROPOSED`).
- **ADR-010:** Frontend-First Judging Experience & Five Primary UIs (`PROPOSED`).
- **ADR-011:** Deterministic Demo Mode Separated from Live Assessment Mode (`PROPOSED`).
- **ADR-012:** Graceful Backend Degradation & LLM Independence (`PROPOSED`).
- **ADR-013:** Evidence Provenance & Transparent Representation of Simulated Findings (`PROPOSED`).

---

## 6. Technology Stack Baseline

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Flow (`@xyflow/react`), Lucide React.
- **Backend:** Python 3.11+, FastAPI (ASGI), Pydantic V2, NetworkX (Graph Algorithms).
- **Database:** SQLite (WAL mode, foreign keys enabled).
- **Scanners:** Gitleaks, Checkov, Trivy, Subfinder.
- **Integration Framework:** HexStrike-AI (via hardened local REST/MCP adapter; non-blocking).

---

## 7. Current Repository State

- **Local Directory:** `d:\REAL_projects\Domain-Vihaan X`
- **Remote Repository:** Clean Git repository with latest commit `5a93ed7fa033f2829a14e66a4046fe77dfbaf39f` on `main`.
- **Files Present:**
  - Root: `AGENTS.md`, `README.md`, `CHANGELOG.md`
  - Product (`docs/01-product/`): `PRD.md`, `PRODUCT_VISION.md`, `USER_JOURNEYS.md`
  - Architecture (`docs/02-architecture/`): `TECHNICAL_IMPLEMENTATION.md`, `SYSTEM_ARCHITECTURE.md`, `DATA_MODEL.md`, `API_CONTRACT.md`, `INTEGRATIONS.md`
  - Project Management (`docs/03-project-management/`): `PROJECT_CONTEXT.md`, `DEVELOPMENT_LOG.md`, `DECISIONS.md`, `TIMELINE.md`, `TEAM_OWNERSHIP.md`, `TASK_TRACKER.md`
  - Quality & Security (`docs/04-quality-and-security/`): `TEST_PLAN.md`, `RISK_REGISTER.md`, `SECURITY_MODEL.md`, `HEXSTRIKE_INTEGRATION.md`
  - Presentation (`docs/05-presentation/`): `DEMO_PLAN.md`, `PITCH_OUTLINE.md`
- **Application Code Status:** 0 lines of application code written (locked pending team sign-off).

---

## 8. Current Team Allocation & Delivery Mandates

- **Developer A (Backend & Security Architecture):**
  - FastAPI Control Plane, SQLite WAL layer.
  - Demo Scenario Provider & One-Click Reset (`app/demo/provider.py`).
  - Scanner subprocess orchestrator & target allowlist guard.
  - Normalization engine (`FindingSchema`).
  - NetworkX graph engine & attack-path DFS algorithm.
  - Contextual Risk Scorer & Embedded Rule AI Fallback engine.
  - Remediation patch engine & automated verification re-scan.
- **Developer B (Frontend & Product Engineering):**
  - React 18 + Vite + Tailwind CSS design system.
  - Five Primary Interfaces:
    1. Security Command Center
    2. Business Security Graph (React Flow canvas & custom nodes)
    3. Threat & Findings Center
    4. Attack Path Investigation Drawer
    5. AI Remediation Center Studio
  - Presentation pitch deck & live demo screen recording backup.
- **Shared Mandates:**
  - Contract-first integration testing.
  - 12-stage live demonstration rehearsal (2x clean-state repeatability).

---

## 9. Active Issues & Blockers

- **Active Blocker BLK-001 [UNVERIFIED]:** Local HexStrike-AI runtime environment verification. Initial inspection found no active processes or listening ports on host.  
  *Mitigation:* ADR-012 enforces complete backend independence. Native CLI scanners and synthetic demo fixtures operate seamlessly without HexStrike.
- **Active Issue ISS-001:** Scaffolding of `backend/` and `frontend/` directories pending Milestone 0 sign-off.

---

## 10. Next Three Immediate Actions

1. Complete revisions across the remaining management, quality, and presentation documents (`TIMELINE.md`, `TEAM_OWNERSHIP.md`, `TASK_TRACKER.md`, `TEST_PLAN.md`, `SECURITY_MODEL.md`, `DEMO_PLAN.md`).
2. Verify cross-document consistency against the new ADR-010 through ADR-013 decisions.
3. Submit the comprehensive revision report to the core engineering team and await explicit sign-off to initiate Milestone 1 code scaffolding.
