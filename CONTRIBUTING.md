# Contributing & Git Workflow Guide — Domain-Vihaan_X

> **Project:** Domain-Vihaan_X  
> **Repository:** `https://github.com/bhavyab212/Domain-Vihaan_X`  
> **Team:** 2-Person Engineering Team (VIHAAN X Hackathon)  
> **Core Doctrine:** **Frontend-first. Backend-reliable. Demo-driven.**  

---

## 1. Team Ownership & Responsibilities

The repository is organized as a modular monorepo with strict division of ownership:

| Area | Primary Owner | Scope |
| :--- | :--- | :--- |
| **`apps/frontend/`** | **Developer B** | React 18, Vite, Tailwind CSS, React Flow visual canvas, 5 primary UI views, API client, frontend tests. |
| **`apps/backend/`** | **Developer A** | FastAPI control plane, SQLite database, scanner subprocess adapters, NetworkX graph engine, risk scorer, offline rule engine, backend tests. |
| **`contracts/`** | **Shared (Joint Sign-Off)** | OpenAPI specifications (`openapi.yaml`), JSON Schemas, payload examples. |
| **`data/demo/`** | **Shared** | Synthetic demonstration scenarios, safe demo fixtures (`test_env/mock_saas/`). |
| **`docs/`** | **Shared** | Architecture decision records, product specifications, test plans, live demo plans. |
| **`tests/`** | **Shared** | Contract validation tests, cross-application end-to-end integration tests. |

---

## 2. Git Branching Strategy

To enable simultaneous parallel development without blocking or merge collisions, the team operates on a structured 4-branch model:

```
[ main ]  ◄───────────────────────────────────────┐
   │                                              │ (Milestone Release PR)
   ▼                                              │
[ integration ]  ◄───────────────┬────────────────┘
   │                             │
   ├──► [ feature/backend-core ] ┘ (Dev A: Tested Backend PR)
   │
   └──► [ feature/frontend-ui ]  ─ (Dev B: Tested Frontend PR)
```

### Branch Definitions
1. **`main`:** The protected production branch. Always contains stable, presentation-ready, deployable code. Never commit directly to `main`.
2. **`integration`:** The shared integration trunk. Feature branches branch from and merge into `integration`. Working milestone verifications occur here before promotion to `main`.
3. **`feature/backend-core`:** Developer A's primary working branch for FastAPI, database, graph algorithms, and scanner orchestration.
4. **`feature/frontend-ui`:** Developer B's primary working branch for React Flow components, Tailwind styling, and dashboard interfaces.

*Note: As mandated by [`AGENTS.md`](AGENTS.md), no git branches may be created or pushed without explicit developer instruction.*

---

## 3. Pull Request & Review Protocol

Every contribution merging into `integration` or `main` must open a Pull Request using [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md).

### PR Checklist Requirements
1. **Scope Alignment:** Traces to an existing task ID in [`docs/03-project-management/TASK_TRACKER.md`](docs/03-project-management/TASK_TRACKER.md).
2. **Contract Compliance:** Any change affecting API routes or payload schemas must update [`contracts/openapi/openapi.yaml`](contracts/openapi/openapi.yaml) first.
3. **Passing Tests:** Unit and integration tests must pass cleanly with stdout/stderr verified.
4. **Zero Secret Leakage:** Code must not introduce credentials, API tokens, or hardcoded passwords.
5. **Documentation Synchronization:** If technical architecture changed, append an ADR to [`docs/03-project-management/DECISIONS.md`](docs/03-project-management/DECISIONS.md) and record progress in [`docs/03-project-management/DEVELOPMENT_LOG.md`](docs/03-project-management/DEVELOPMENT_LOG.md).
6. **UI Screenshots / Video:** Frontend PRs must include screenshots or GIF recordings of the new interface component.

---

## 4. Contract-First Development Protocol

When an API change is required:
1. **Propose:** The author proposes the schema change in `contracts/schemas/` or `contracts/openapi/openapi.yaml`.
2. **Review:** Both developers review the proposal to ensure naming and data types are mutually agreed upon.
3. **Update:** Merge contract update into `contracts/`.
4. **Implement:** Developer A updates the FastAPI endpoint and Pydantic schema in `apps/backend/`.
5. **Consume:** Developer B updates the TypeScript interface and API client in `apps/frontend/`.
6. **Verify:** Contract test in `tests/contract/` validates bidirectional compatibility.
