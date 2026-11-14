# Changelog

All notable changes to the **Domain-Vihaan_X** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Initialization of backend FastAPI application skeleton with SQLite WAL mode.
- Initialization of frontend React + Vite + Tailwind CSS scaffolding with Five Primary Interfaces.
- Implementation of Demo Scenario Provider & One-Click Reset (`app/demo/provider.py`).
- Implementation of Gitleaks, Trivy, and Checkov scanner adapters.
- React Flow Business Security Graph visualization component with animated kill-chain edges.
- Contextual risk-scoring engine and embedded rule-based offline AI fallback.
- Synthetic demo environment seed script (`test_env/mock_saas/`).

---

## [0.1.1-doc] - 2026-11-15

### Changed & Revised
- **Judging-First Development Philosophy:** Formally adopted **"Frontend-first. Backend-reliable. Demo-driven."** as the governing product and engineering doctrine.
- **Five Primary Interfaces Standardized:** Re-architected frontend specifications across `PRD.md`, `TECHNICAL_IMPLEMENTATION.md`, and `SYSTEM_ARCHITECTURE.md` to center around:
  1. Security Command Center
  2. Business Security Graph (Signature visual differentiator)
  3. Threat and Findings Center
  4. Attack Path Investigation Drawer
  5. AI Remediation Center Studio
- **Dual Operating Mode Architecture:** Established explicit partition between `DEMO_MODE` (offline deterministic synthetic environment with one-click reset) and `LIVE_ASSESSMENT_MODE` (authorized real-world scanning with live progress).
- **Backend Resilience & Graceful Degradation:** Designed embedded rule-based explanation engine (`RuleBasedExplanationEngine`) ensuring zero hard dependency on external LLM services or internet access; decoupled platform from HexStrike-AI availability.
- **New Architecture Decision Records:** Appended proposed records ADR-010 (Frontend-First Judging Experience), ADR-011 (Deterministic Demo Mode vs Live Mode), ADR-012 (Graceful Backend Degradation & LLM Independence), and ADR-013 (Evidence Provenance & Transparent Simulated Findings).
- **2x Repeatable Demonstration Standard:** Updated `DEMO_PLAN.md` and `TEST_PLAN.md` with explicit criteria and test specs requiring the 12-stage live demonstration to execute, reset via API, and repeat consecutively twice from a clean state.

---

## [0.1.0-doc] - 2026-11-14

### Added
- **Permanent Agent Protocol (`AGENTS.md`):** Established non-negotiable governance principles, execution boundaries, documentation maintenance workflows, and factual accuracy rules for Antigravity and autonomous contributors.
- **Project Landing Page (`README.md`):** Complete product overview, core value proposition, MVP scope, C4 architecture summary, documentation tree index, and team ownership layout.
- **Product Documentation Package (`docs/01-product/`):**
  - `PRD.md`: Full Product Requirements Document with 28 detailed sections, functional requirements (FR-001 through FR-016), non-functional requirements (NFR-001 through NFR-008), and security requirements (SEC-001 through SEC-010).
  - `PRODUCT_VISION.md`: Long-term commercial and technical vision, market differentiation, core philosophy, and business model hypotheses.
  - `USER_JOURNEYS.md`: End-to-end persona journeys (SaaS Founder, Engineering Lead, Security Operator, Development Agency) with failure-state analysis.
- **Architecture Documentation Package (`docs/02-architecture/`):**
  - `TECHNICAL_IMPLEMENTATION.md`: Full engineering blueprint covering React/FastAPI/SQLite/NetworkX stack, normalization engine, risk algorithm, and deployment.
  - `SYSTEM_ARCHITECTURE.md`: Detailed C4 context and container diagrams, component workflows, data flow diagrams, and control/execution plane boundaries.
  - `DATA_MODEL.md`: Formal entity schemas, relational tables, graph node/edge definitions, primary/foreign keys, and constraints.
  - `API_CONTRACT.md`: Complete OpenAPI-aligned REST API contracts with request/response JSON schemas, validations, and error codes.
  - `INTEGRATIONS.md`: Comprehensive adapter specifications for Gitleaks, Trivy, Checkov, Subfinder, Nuclei, Nmap, and HexStrike-AI.
- **Project Management System (`docs/03-project-management/`):**
  - `PROJECT_CONTEXT.md`: Living source-of-truth document tracking repository state, decisions, active blockers, and immediate actions.
  - `DEVELOPMENT_LOG.md`: Chronological developer journal for tracking technical progress and session outcomes.
  - `DECISIONS.md`: Initial Architecture Decision Records (ADR-001 through ADR-009) covering MVP scope, graph differentiator, database choice, and security isolation.
  - `TIMELINE.md`: High-resolution milestone timeline in IST leading to the live demo deadline on November 15, 2026, 9:00 AM IST.
  - `TEAM_OWNERSHIP.md`: Two-person engineering allocation matrix, interface contracts, and handoff protocols.
  - `TASK_TRACKER.md`: Exhaustive backlog and active task registry with unique IDs, estimates, and acceptance criteria.
- **Quality & Security Package (`docs/04-quality-and-security/`):**
  - `TEST_PLAN.md`: Multi-tier verification strategy covering unit, integration, graph correlation, risk scoring, and synthetic demo test suites.
  - `RISK_REGISTER.md`: Quantitative risk matrix (R-001 through R-013) with mitigations and ownership assignments.
  - `SECURITY_MODEL.md`: Defense-in-depth threat model, trust boundaries, command injection prevention, and human-in-the-loop controls.
  - `HEXSTRIKE_INTEGRATION.md`: Dedicated technical security assessment, sandboxing architecture, target allowlisting, and CVE mitigation strategy for HexStrike-AI.
- **Presentation & Hackathon Assets (`docs/05-presentation/`):**
  - `DEMO_PLAN.md`: Scripted 12-stage live demonstration walkthrough, screen progression, speaker scripts, and fallback procedures.
  - `PITCH_OUTLINE.md`: Concise VIHAAN X pitch deck narrative aligned with hackathon judging criteria.

---

## [0.0.1] - 2026-11-14

### Added
- Initial repository setup on GitHub (`https://github.com/bhavyab212/Domain-Vihaan_X`) containing default `README.md` (`# Domain-Vihaan_X`) at commit `bafab7b6a4891024690c8f64b7a4b631e9e5b6f3`.
