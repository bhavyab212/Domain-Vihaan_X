# Claude Code Instructions — Domain-Vihaan_X

> **Role Context:** You are assisting **Developer B** on **Frontend & UX/UI Architecture** for the VIHAAN X Hackathon project **Domain-Vihaan_X**.  
> **Backend Counterpart:** Developer A (Bhavya) is working in parallel on `apps/backend/` using Google Antigravity.  
> **Core Doctrine:** **Frontend-first. Backend-reliable. Demo-driven.**

---

## 1. Mandatory Governance & Reading Before Implementation

Before writing, editing, or exploring code, you **MUST** read and respect the project's living documentation:

1. **Governance & Boundaries:** Read [`AGENTS.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/AGENTS.md). It is the supreme project engineering protocol.
2. **Current Project Context:** Read [`docs/03-project-management/PROJECT_CONTEXT.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/03-project-management/PROJECT_CONTEXT.md) for current phase, baseline commit, and active focus.
3. **Architecture Decisions:** Read [`docs/03-project-management/DECISIONS.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/03-project-management/DECISIONS.md) before proposing or adopting any architectural changes.
4. **Task Register:** Read [`docs/03-project-management/TASK_TRACKER.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/03-project-management/TASK_TRACKER.md) before selecting or updating any task.
5. **API & Data Contracts:** Read [`contracts/openapi/openapi.yaml`](file:///d:/REAL_projects/Domain-Vihaan%20X/contracts/openapi/openapi.yaml) and [`contracts/schemas/`](file:///d:/REAL_projects/Domain-Vihaan%20X/contracts/schemas/) before writing any API calls, data models, or client hooks.

---

## 2. Ownership Boundaries

- **You Own (`apps/frontend/`):** React 18, TypeScript, Vite, Tailwind CSS, React Flow (`@xyflow/react`), Lucide icons, components, hooks, frontend test suites, and presentation media in `artifacts/`.
- **Developer A Owns (`apps/backend/`):** FastAPI control plane, database, scanner orchestration, intelligence/graph algorithms, rule fallback, and backend tests.
- **Strict Prohibition:** **Never modify files in `apps/backend/`** unless explicitly instructed by the user.
- **Shared Directories (`contracts/`, `docs/`, `data/demo/`, `tests/`):** Jointly owned. Do not unilaterally alter API endpoints or JSON schemas without mutual coordination.

---

## 3. Git Workflow & Branching

Always follow the agreed task-branch model defined in [`CONTRIBUTING.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/CONTRIBUTING.md):

1. **Trunk Branch:** Never commit directly to `main` or `integration`.
2. **Task Branches:** Create short-lived branches off `integration`:
   ```bash
   git switch integration
   git pull origin integration
   git switch -c frontend/<task-id>
   ```
3. **Pull Requests:** Push your branch and open a PR targeting `integration`:
   ```bash
   git push -u origin frontend/<task-id>
   gh pr create --base integration --head frontend/<task-id>
   ```

---

## 4. Frontend Engineering Standards

1. **The 5 Primary Interfaces:**
   - Security Command Center (`apps/frontend/src/features/overview/`)
   - Business Security Graph (`apps/frontend/src/features/attack-paths/`) — Signature visual differentiator using React Flow.
   - Threat and Findings Center (`apps/frontend/src/features/findings/`)
   - Asset Inventory (`apps/frontend/src/features/assets/`)
   - AI Remediation Center Studio (`apps/frontend/src/features/remediation/`)
2. **Offline & Demo Readiness:**
   - Always verify that the UI works gracefully using mock fixtures from `apps/frontend/src/mocks/fixtures.ts`.
   - The UI must handle backend loading, errors, and empty states cleanly.
3. **No Direct HexStrike Connection:** The frontend communicates strictly with Developer A's FastAPI backend (`/api/v1/`). Never connect directly to HexStrike or MCP servers.
4. **Documentation Updates:** Keep `apps/frontend/README.md` updated and report any cross-module impacts to Developer A for integration into `docs/`.
