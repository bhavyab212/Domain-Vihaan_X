# Team Ownership & Interface Protocol — Domain-Vihaan_X

> **Document ID:** TEAM-001  
> **Project Name:** Domain-Vihaan_X  
> **Domain:** Cybersecurity (VIHAAN X Hackathon)  
> **Team Size:** 2 Engineers (Co-Founding Team)  
> **Status:** ACTIVE & MANDATORY  
> **Last Updated:** 2026-11-15T00:32:00+05:30  
> **Core Strategic Philosophy:** **Frontend-first. Backend-reliable. Demo-driven.**  

---

## 1. Team Allocation Philosophy

Under our **Frontend-first, Backend-reliable, Demo-driven** engineering doctrine, success depends on **strict separation of concerns**, **contract-first development**, and **prioritizing a complete vertical workflow over feature quantity**.

The boundary between Developer A and Developer B is cleanly demarcated by the **REST API Contract** ([`docs/02-architecture/API_CONTRACT.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/02-architecture/API_CONTRACT.md)):
- **Developer B (Frontend & Product):** Delivers an exceptionally polished, responsive, and intuitive visual experience across the **Five Primary Interfaces**, ensuring the signature **Business Security Graph** mesmerizes hackathon evaluators.
- **Developer A (Backend & Security Architecture):** Delivers an unshakeable, reliable, and predictable backend that operates deterministically in **Demo Mode**, handles adverse conditions gracefully, and supports one-click resets.

---

## 2. Primary Responsibility Matrix

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DEVELOPER ALLOCATION MATRIX                     │
├───────────────────────────────────┬────────────────────────────────────┤
│ DEVELOPER A: BACKEND & SECURITY   │ DEVELOPER B: FRONTEND & PRODUCT    │
├───────────────────────────────────┼────────────────────────────────────┤
│ • FastAPI Control Plane & SQLite  │ • React 18 + Vite + Tailwind App   │
│ • Security Scanner Orchestration  │ • UX/UI & Visual Design System     │
│   (Gitleaks, Checkov, Trivy)      │ • 1. Security Command Center       │
│ • Intelligence & Graph Engine     │ • 2. Business Security Graph       │
│   (NetworkX DFS, Choke-Point Math)│   (React Flow Canvas & Custom Nodes│
│ • Contextual Risk Scorer          │ • 3. Threat and Findings Center    │
│ • Demo Mode Scenario Provider     │ • 4. Attack Path Investigation     │
│   & One-Click Reset Endpoint      │ • 5. AI Remediation Center Studio  │
│ • Reliability & Degradation Engine│ • Real-time Status Polling Hook    │
│   (Embedded Rule-Based AI Fallback│ • Error Boundaries & Skeleton UI   │
│ • Remediation Patch Worker &      │ • Presentation Pitch Deck Slides   │
│   Automated Verification Rescan   │ • Demo Backup Screen Recording     │
├───────────────────────────────────┴────────────────────────────────────┤
│                       SHARED RESPONSIBILITIES                          │
│ • Contract-First REST API Schemas & Data Model Specifications          │
│ • Synthetic SaaS Test Fixture Design (`test_env/mock_saas/`)           │
│ • Architecture Decision Records (ADRs) Sign-Off                        │
│ • End-to-End System Integration Testing                                │
│ • 2x Repeatable Demo Rehearsal (Reset -> Scan -> Graph -> Rescan)      │
│ • Live Hackathon Evaluation Presentation & Q&A                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Ownership

### 3.1 Developer A — Backend, Scanners, Intelligence & Reliability
- **Directory Scope:** `apps/backend/`, `data/`
- **Key Deliverables Owned:**
  1. `apps/backend/app/main.py`: FastAPI server, CORS configuration, global error handling.
  2. `apps/backend/app/api/`: REST route handlers adhering to [`API_CONTRACT.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/02-architecture/API_CONTRACT.md) and `contracts/openapi/openapi.yaml`.
  3. `apps/backend/app/demo/`: `DemoScenarioProvider` managing deterministic synthetic data (`data/demo/`) and `POST /api/v1/demo/reset`.
  4. `apps/backend/app/orchestration/`: Subprocess manager with `shell=False`, 60s timeout guards, and allowlist validation.
  5. `apps/backend/app/intelligence/normalizer.py`: Pydantic V2 parsing models transforming raw scanner outputs into `FindingResponse`.
  6. `apps/backend/app/intelligence/asset_graph.py`: In-memory NetworkX directed property graph, cycle detection, and DFS path traversals.
  7. `apps/backend/app/intelligence/risk_engine.py`: Deterministic Contextual Risk Scoring formula ($0.0 - 100.0$).
  8. `apps/backend/app/ai/`: Grounded LLM prompt integration + embedded `rule_fallback.py` (offline fallback).
  9. `apps/backend/app/remediation/`: Patch application logic, targeted Checkov re-scan trigger, and edge severing verification.
  10. `apps/backend/app/database/`: SQLite connection pool in WAL mode and audit logging repository.

---

### 3.2 Developer B — Frontend, UX/UI, Graph & Remediation Studio
- **Directory Scope:** `apps/frontend/`, `artifacts/`
- **Key Deliverables Owned:**
  1. `apps/frontend/src/app/App.tsx`: App layout, global state context, and route navigation.
  2. `apps/frontend/src/features/overview/OverviewView.tsx`: Executive posture cockpit, KPI cards, and one-click demo reset trigger.
  3. `apps/frontend/src/features/attack-paths/AttackPathsView.tsx`: **Signature Feature** — React Flow canvas (`@xyflow/react`), custom `AssetNode` and `FindingNode` cards, pulsating red attack edges, minimap, and inspector drawer.
  4. `apps/frontend/src/features/findings/FindingsView.tsx`: High-density findings table with search, category filtering, severity indicators, and raw evidence drawers.
  5. `apps/frontend/src/features/assets/AssetsView.tsx`: Complete digital asset inventory with environment & criticality filters.
  6. `apps/frontend/src/features/remediation/RemediationView.tsx`: Remediation interface with unified diff viewer, human approval dialog, and green "SEVERED" verification state.
  7. `apps/frontend/src/lib/api/client.ts`: Typed TypeScript client mapping to backend endpoints.
  8. `artifacts/`: Pitch deck slides and backup live demo video (`demo_backup.mp4`).

---

## 4. Contract-First Development & Handoff Protocols

To guarantee seamless parallel development:

### Step 1: Mock Staging
Developer A and Developer B jointly maintain `contracts/schemas/` and `contracts/examples/`. Developer B builds the complete UI against `apps/frontend/src/mocks/fixtures.ts` without waiting for backend code.

### Step 2: Integration Handshakes
1. **Handshake 1:** `/api/v1/health` and `/api/v1/demo/reset` -> Verify connectivity, CORS, and one-click reset.
2. **Handshake 2:** `GET /api/v1/graph` -> Connect live NetworkX graph to React Flow canvas.
3. **Handshake 3:** `GET /api/v1/findings` & `GET /api/v1/assessments/{id}/status` -> Connect live scanner / demo run findings.
4. **Handshake 4:** `POST /api/v1/remediations/{id}/approve` -> Connect approval modal to live patch execution and automated edge severing.

### Step 3: 2x Repeatability Verification
Both developers participate in executing the full 12-stage demo flow from start to finish, triggering `POST /api/demo/reset`, and repeating the flow immediately to guarantee zero state leakage.
