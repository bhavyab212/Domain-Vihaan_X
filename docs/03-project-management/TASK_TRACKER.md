# Task Tracker & Engineering Backlog — Domain-Vihaan_X

> **Document ID:** TASK-001  
> **Project Name:** Domain-Vihaan_X  
> **Domain:** Cybersecurity (VIHAAN X Hackathon)  
> **Status:** ACTIVE REGISTER  
> **Last Updated:** 2026-11-15T00:34:00+05:30  
> **Core Strategic Philosophy:** **Frontend-first. Backend-reliable. Demo-driven.**  
> **Rule:** Do not mark a task `DONE` merely because it is documented. Only mark `DONE` when code is written, integrated, and verified against acceptance criteria.  

---

## 1. Status Taxonomy
- `BACKLOG`: Defined task awaiting prerequisite milestones.
- `READY`: Prerequisites satisfied; ready for immediate implementation.
- `IN_PROGRESS`: Actively being coded by assigned engineer.
- `IN_REVIEW`: Code complete; awaiting integration handshake or peer review.
- `BLOCKED`: Work halted due to an explicit technical impediment.
- `DONE`: Fully implemented, integrated, and verified against acceptance criteria.

---

## 2. Active Master Task Register

| Task ID | Task Title | Priority | Owner | Status | Est. Duration | Dependencies | Requirements |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TSK-001** | Documentation & Governance Revision System | **P0** | Shared | **DONE** | 90 min | None | FR-001–FR-019 |
| **TSK-002** | Synthetic SaaS Fixtures & One-Click Reset API | **P0** | Dev A | **IN_REVIEW** | 45 min | TSK-003 | FR-017, FR-018 |
| **TSK-003** | FastAPI App Shell & SQLite WAL Mode Database | **P0** | Dev A | **IN_REVIEW** | 45 min | TSK-001 | FR-001, NFR-006 |
| **TSK-004** | React 18 + Vite Shell & Five Primary UIs Layout | **P0** | Dev B | **READY** | 45 min | TSK-001 | FR-013, NFR-005 |
| **TSK-005** | Finding Normalization Engine (`FindingSchema`) | **P0** | Dev A | **IN_REVIEW** | 60 min | TSK-003 | FR-004, NFR-008 |
| **TSK-006** | NetworkX Business Security Graph Model | **P0** | Dev A | **IN_REVIEW** | 60 min | TSK-005 | FR-005, FR-006 |
| **TSK-007** | React Flow Interactive Canvas Setup | **P0** | Dev B | **BACKLOG** | 60 min | TSK-004 | FR-014, NFR-001 |
| **TSK-008** | Attack-Path Traversal Algorithm (DFS) | **P0** | Dev A | **IN_REVIEW** | 45 min | TSK-006 | FR-007, NFR-007 |
| **TSK-009** | Deterministic Contextual Risk Scorer ($0.0-10.0$) | **P0** | Dev A | **READY** | 30 min | TSK-006 | FR-008, NFR-007 |
| **TSK-010** | Custom Node Cards & Pulsating Attack Edge | **P0** | Dev B | **BACKLOG** | 60 min | TSK-007 | FR-014 |
| **TSK-011** | Gitleaks CLI Subprocess Adapter (`shell=False`) | **P0** | Dev A | **READY** | 30 min | TSK-003 | FR-003, SEC-002 |
| **TSK-012** | Checkov IaC Subprocess Adapter (`shell=False`) | **P0** | Dev A | **READY** | 30 min | TSK-003 | FR-003, SEC-002 |
| **TSK-013** | Hardened HexStrike-AI Bridge (Graceful Fallback)| **P0** | Dev A | **BACKLOG** | 30 min | TSK-003 | FR-003, SEC-003 |
| **TSK-014** | Subfinder Subdomain Discovery Adapter | **P0** | Dev A | **BACKLOG** | 30 min | TSK-003 | FR-003, SEC-001 |
| **TSK-015** | Grounded AI Analysis & Embedded Rule Fallback | **P0** | Dev A | **BACKLOG** | 45 min | TSK-008 | FR-009, NFR-003 |
| **TSK-016** | Threat & Findings Center Triage Table UI | **P0** | Dev B | **BACKLOG** | 45 min | TSK-004 | FR-015 |
| **TSK-017** | Attack Path Investigation Drawer & Kill Chain | **P0** | Dev B | **BACKLOG** | 45 min | TSK-010, TSK-015 | FR-016 |
| **TSK-018** | Remediation Recommendation & Diff Generator | **P0** | Dev A | **BACKLOG** | 45 min | TSK-008 | FR-010 |
| **TSK-019** | Human Approval Modal & Remediation Execution | **P0** | Dev A | **BACKLOG** | 30 min | TSK-018 | FR-011, SEC-005 |
| **TSK-020** | Automated Reassessment Verification Loop | **P0** | Dev A | **BACKLOG** | 45 min | TSK-019 | FR-012 |
| **TSK-021** | AI Remediation Center Studio (Diff & Green Sever)| **P0** | Dev B | **BACKLOG** | 45 min | TSK-019 | FR-019 |
| **TSK-022** | Security Command Center (KPIs & Reset Trigger) | **P0** | Dev B | **BACKLOG** | 30 min | TSK-002, TSK-004 | FR-013 |
| **TSK-023** | End-to-End Vertical Slice Integration Test | **P0** | Shared | **BACKLOG** | 45 min | TSK-020, TSK-021 | All P0 FRs |
| **TSK-024** | 2x Repeatable Clean-State Demo Rehearsal | **P0** | Shared | **BACKLOG** | 30 min | TSK-023 | 11 Criteria |
| **TSK-025** | Emergency Backup Screen Recording & Video Export | **P0** | Dev B | **BACKLOG** | 20 min | TSK-024 | Demo Plan |

---

## 3. Milestone 1 & 2 Task Specifications

### TSK-002: Synthetic SaaS Fixtures & One-Click Reset API
- **Owner:** Developer A
- **Priority:** `P0`
- **Status:** `IN_REVIEW` (`[IMPLEMENTED]` & `[TESTED]`)
- **Description:** Implement `app/demo/provider.py` and endpoint `POST /api/v1/demo/reset`. Restores synthetic SaaS environment from committed baseline `data/demo/mock_saas/` into runtime directory `data/runtime/demo_workspace/mock_saas/`:
  1. `repo/config/staging.env`: synthetic AWS key `AKIAIOSFODNN7EXAMPLE`.
  2. `iac/iam_staging.tf`: Terraform IAM policy with wildcard `s3:*` admin permission.
  3. `storage/buckets.json`: `customer-pii-vault-prod` metadata.
  4. Flushes SQLite demo records and reseeds baseline assets, findings (provenance `SIMULATED_DEMO`), relationships, and attack paths in < 1 second.
- **Acceptance Criteria:**
  - Calling `POST /api/v1/demo/reset` returns HTTP `200 OK` with `DemoResetResponse` and re-seeds clean state.
  - Zero real credentials stored or exposed.
  - Measured reset duration < 1000ms (achieved ~22ms average).
  - SQLite WAL mode and foreign keys empirically verified.
  - Non-demo (live assessment) records protected during reset.

---

### TSK-003: FastAPI App Shell & SQLite WAL Mode Database
- **Owner:** Developer A
- **Priority:** `P0`
- **Status:** `IN_REVIEW` (`[IMPLEMENTED]` & `[TESTED]` — ADR-005 Accepted)
- **Description:** Implement clean FastAPI application factory, versioned API router (`/api/v1`), structured logging, centralized exception handlers, safe configuration defaults, and `GET /api/v1/health` with honest scanner telemetry.
- **Acceptance Criteria:**
  - `GET /api/v1/health` returns HTTP 200 with `status: "healthy"` and `mode: "DEMO_MODE"`.
  - Scanners report honest telemetry (`ready`, `unverified`, `optional-unconfigured`).
  - Pytest test suite passes with 100% verified assertions.
  - Database schema implementation cleanly abstracted until ADR-005 approval.

---

### TSK-004: React 18 + Vite Shell & Five Primary UIs Layout
- **Owner:** Developer B
- **Priority:** `P0`
- **Description:** Scaffolds frontend with Vite, Tailwind CSS, and React Router. Sets up top navbar with `[DEMO MODE: SYNTHETIC SAAS]` indicator and navigation routes to the Five Primary Interfaces:
  1. `/` (Security Command Center)
  2. `/graph` (Business Security Graph)
  3. `/threats` (Threat and Findings Center)
  4. `/paths` (Attack Path Investigation)
  5. `/remediation` (AI Remediation Center)
- **Acceptance Criteria:**
  - Responsive dark theme layout with clean active route indicators.
  - One-click demo reset button in navbar dispatches `POST /api/demo/reset`.

---

### TSK-007 & TSK-010: React Flow Signature Canvas & Custom Nodes
- **Owner:** Developer B
- **Priority:** `P0`
- **Description:** Implement React Flow canvas in `src/views/SecurityGraph.tsx` with custom `AssetNode` (repo, cloud, IAM icons) and `FindingNode` (severity badges). Render active attack path as an animated pulsating red SVG stroke.
- **Acceptance Criteria:**
  - Canvas renders 4-node attack chain from synthetic data with smooth drag/zoom/pan.
  - Selecting an attack path focuses and highlights the corresponding edges.

---

### TSK-015: Grounded AI Analysis & Embedded Rule Fallback Engine
- **Owner:** Developer A
- **Priority:** `P0`
- **Description:** Implement `app/ai/analyzer.py` and `app/ai/rule_fallback.py`. If external LLM times out (> 5s) or fails, the embedded rule engine generates an instant, structured explanation of the kill chain:
  > *"Committed staging AWS secret in repo allows assuming StagingDeployer role. Wildcard permissions grant exfiltration access to customer database backup bucket."*
- **Acceptance Criteria:**
  - Endpoint `POST /api/ai/analyze/{id}` responds in < 50ms in offline mode with `offline_mode=true`.
  - Zero hallucinated CVEs or external IPs.
