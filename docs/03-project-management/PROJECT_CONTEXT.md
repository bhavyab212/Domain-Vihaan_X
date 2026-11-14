# Project Living Context & Working Memory — Domain-Vihaan_X

> **Document ID:** CTX-001  
> **Project Name:** Domain-Vihaan_X  
> **Domain:** Cybersecurity (VIHAAN X Hackathon)  
> **Status:** ACTIVE LIVING DOCUMENT (Single Source of Truth)  
> **Last Updated:** 2026-11-15T05:00:00+05:30  
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

Deliver the complete, fully integrated backend intelligence & remediation engine:
1. Grounded AI Analysis Engine with deterministic rule fallback (< 50ms) (TSK-015).
2. Human-in-the-Loop Remediation Generator & Unified Diff Engine (TSK-018).
3. Human Approval Gate & Atomic Patch Executor with `.bak` safety rollback (TSK-019).
4. Automated Reassessment Verification Loop for closed-loop attack path mitigation (TSK-020).
All on active feature branch `backend/TSK-015-018-019-020-ai-remediation`.

---

## 3. Current Development Phase

- **Current Phase:** **Phase 4 — AI Security Intelligence & Human-in-the-Loop Remediation Engine (TSK-015, TSK-018, TSK-019, TSK-020 Completed & Tested; All 104 Backend Tests Passing with 89% Coverage)**
- **Active Task Branch:** `backend/TSK-015-018-019-020-ai-remediation`
- **Previous Feature Branches:**
  - `backend/TSK-009-011-014-security-operations` (Pushed to origin)
  - `backend/TSK-002-005-006-008-integration` (Pushed to origin)
- **Next Phase:** **Frontend Handoff & End-to-End Demo Rehearsal (Assisting Developer B with React Flow & 5 Primary UIs)**

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
- **ADR-008:** Deterministic Contextual Risk Scoring with Structured LLM Explanations (`ACCEPTED` under delegated architectural authority).
- **ADR-009:** Synthetic Test Assets and Controlled Demonstration Scenario (`ACCEPTED`).
- **ADR-014:** Grounded AI Analysis, Human-Approved Patch Execution, and Reassessment Verification Loop (`ACCEPTED` under delegated architectural authority).

### Proposed Architecture Awaiting Formal Approval
- **ADR-006:** React Flow (`@xyflow/react`) for Graph Visualization (`PROPOSED`).
- **ADR-010:** Frontend-First Judging Experience & Five Primary UIs (`PROPOSED`).
- **ADR-011:** Deterministic Demo Mode Separated from Live Assessment Mode (`PROPOSED`).
- **ADR-012:** Graceful Backend Degradation & LLM Independence (`PROPOSED`).
- **ADR-013:** Evidence Provenance & Transparent Representation of Simulated Findings (`PROPOSED`).

---

## 6. Technology Stack Baseline

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Flow (`@xyflow/react`), Lucide React.
- **Backend:** Python 3.11+, FastAPI (ASGI), Pydantic V2, NetworkX (Graph Algorithms), SQLAlchemy 2.0.
- **Database:** SQLite (WAL mode, foreign keys enabled).
- **Scanners:** Gitleaks, Checkov, Trivy, Subfinder.
- **Integration Framework:** HexStrike-AI (via hardened local REST/MCP adapter; non-blocking).

---

## 7. Current Repository State

- **Local Directory:** `d:\REAL_projects\Domain-Vihaan X`
- **Current Branch:** `backend/TSK-015-018-019-020-ai-remediation`
- **Application Code Status:** 
  - Backend Application Foundation complete (`apps/backend/app/main.py`).
  - Synthetic Demo Provider & Reset Engine complete (`apps/backend/app/demo/provider.py`).
  - Finding Normalization Engine complete (`apps/backend/app/intelligence/normalizer.py`).
  - Business Security Graph complete (`apps/backend/app/intelligence/asset_graph.py`).
  - Bounded DFS Attack Path Engine complete (`apps/backend/app/intelligence/attack_path.py`).
  - Contextual Risk Engine complete (`apps/backend/app/intelligence/risk_engine.py` - TSK-009).
  - Hardened Gitleaks Subprocess Adapter complete (`apps/backend/app/integrations/scanners/gitleaks.py` - TSK-011).
  - Hardened Checkov IaC Subprocess Adapter complete (`apps/backend/app/integrations/scanners/checkov.py` - TSK-012).
  - Hardened HexStrike Loopback Bridge complete (`apps/backend/app/integrations/scanners/hexstrike.py` - TSK-013).
  - Subfinder Subdomain Discovery Adapter complete (`apps/backend/app/integrations/scanners/subfinder.py` - TSK-014).
  - Multi-Scanner Assessment Runner complete (`apps/backend/app/orchestration/runner.py`).
  - Grounded AI Security Analyst & Rule Fallback Engine complete (`apps/backend/app/ai/analyzer.py`, `app/ai/rule_fallback.py` - TSK-015).
  - Unified Diff Engine & Remediation Proposal Generator complete (`apps/backend/app/remediation/differ.py`, `app/remediation/generator.py` - TSK-018).
  - Human Approval Gate & Atomic Patch Executor complete (`apps/backend/app/remediation/executor.py` - TSK-019).
  - Automated Reassessment Verification Loop complete (`apps/backend/app/remediation/verifier.py` - TSK-020).
  - Endpoints:
    - `POST /api/v1/demo/reset`
    - `GET /api/v1/health`
    - `GET /api/v1/assets`, `POST /api/v1/assets`
    - `POST /api/v1/assessments/trigger`, `GET /api/v1/assessments/{id}/status`
    - `GET /api/v1/findings`
    - `GET /api/v1/graph`
    - `GET /api/v1/attack-paths`
    - `POST /api/v1/ai/analyze/{path_id}`
    - `GET /api/v1/remediations`, `GET /api/v1/remediations/{id}`
    - `POST /api/v1/remediations/{id}/approve`, `POST /api/v1/remediations/{id}/reject`
    - `POST /api/v1/remediations/{id}/verify`
  - **104 automated tests passing** across 18 test suites in 2.78s with 89% total coverage and 0 warnings.
  - Zero modifications to `apps/frontend/` (Developer B workspace strictly preserved).
  - Hardened HexStrike Loopback Bridge complete (`apps/backend/app/integrations/scanners/hexstrike.py` - TSK-013).
  - Subfinder Subdomain Discovery Adapter complete (`apps/backend/app/integrations/scanners/subfinder.py` - TSK-014).
  - Multi-Scanner Assessment Runner complete (`apps/backend/app/orchestration/runner.py`).
  - Endpoints: `POST /api/v1/demo/reset`, `GET /api/v1/health`, `GET /api/v1/graph`, `GET /api/v1/attack-paths`.
  - 89 automated tests passing in 2.37s with 0 warnings.
  - Zero modifications to `apps/frontend/` (Developer B workspace preserved).

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
