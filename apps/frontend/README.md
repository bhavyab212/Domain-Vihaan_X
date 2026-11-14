# Domain-Vihaan_X — Frontend Application (`apps/frontend`)

> **Owner:** Developer B (Frontend & Product Engineering)  
> **Framework:** React 18 + Vite + TypeScript + Tailwind CSS  
> **Status:** TSK-004 shell, five primary routes, preview data, typed API client
>
> **Core Doctrine:** **Frontend-first. Backend-reliable. Demo-driven.**

This is the single-page web client for **Domain-Vihaan_X**. It is a *presentation consumer*: the backend remains the
source of truth for graph intelligence, risk calculation, finding normalization and business logic.

---

## 1. Quick start

```bash
cd apps/frontend
npm install
npm run dev        # http://127.0.0.1:5173  (port is fixed: the backend CORS allowlist only permits :5173)
```

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Vite dev server on `127.0.0.1:5173` (`strictPort`) |
| `npm run build` | `tsc --noEmit` then production build to `dist/` |
| `npm run typecheck` | TypeScript strict check only |
| `npm test` | Vitest + React Testing Library, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run preview` | Serve the production build locally |

### Environment variables

Copy `.env.example` to `.env.local`. **Everything prefixed `VITE_` ships in the public bundle; never put secrets here.**

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Control-plane base URL. Source of truth: `contracts/openapi/openapi.yaml` `servers[0].url` |
| `VITE_DATA_SOURCE` | `preview` | Initial data source: `preview` (local `SIMULATED_DEMO` fixtures) or `api` (live backend). Users can switch at runtime in the command bar; the choice is kept in `localStorage` |

### Dependencies

| Package | Why |
| :--- | :--- |
| `react`, `react-dom` 18 | UI runtime (project stack) |
| `react-router-dom` 6 | Routing for the five primary views |
| `tailwindcss` 3, `postcss`, `autoprefixer` | Styling and design tokens (project stack) |
| `lucide-react` | Icons (project stack) |
| `clsx`, `tailwind-merge` | Conditional/merged class names (`cn()`) |
| `@fontsource-variable/geist`, `@fontsource-variable/geist-mono` | Self-hosted UI and code fonts, so the UI never depends on a CDN (the demo must work offline) |
| `vitest`, `jsdom`, `@testing-library/*` | Frontend test foundation |

**Not installed on purpose:** `@xyflow/react` (React Flow). It was listed in the original scaffold, but **ADR-006 is still
`PROPOSED`**, so it has been removed until the decision is formally accepted. See "Graph architecture" below.

---

## 2. Routes

| Route | View | Purpose |
| :--- | :--- | :--- |
| `/` | Security Command Center | Findings tallied by severity, potential attack paths, MVP domain overview, asset inventory, recent activity, priority recommendations |
| `/graph` | Business Security Graph | Relationship map (repository → secret finding → IAM role → cloud storage) with selected-node inspector and optional path highlight |
| `/threats` | Threats & Findings | Search/filter table, severity, category, asset, scanner, provenance, detail drawer with evidence and guidance |
| `/paths` | Attack Path Investigation | Entry point → steps → target, choke point, evidence references, confidence; always labelled *inferred* |
| `/remediation` | Remediation Studio | Queue, recommended fix, unified diff, human approval, lifecycle stepper, verification result |

Unknown routes render a "Page not found" state, never a blank page.

---

## 3. UI architecture

```
src/
├── app/            App.tsx, router.tsx, routerFuture.ts, main.tsx
│   └── providers/  DataSourceProvider (preview|api), BackendStatusProvider (real /health), DemoResetProvider
├── components/
│   ├── ui/         Button, Badge, Panel (design-system atoms)
│   ├── layout/     AppShell, Sidebar, CommandBar, Banners, navigation
│   └── common/     SeverityBadge, ProvenanceBadge, States (skeleton/empty/error), AsyncBoundary, Drawer, DiffViewer, ...
├── features/       overview, graph, findings, attack-paths, remediation (one folder per primary interface)
├── hooks/          useAsyncData (3-state loading), useSourceData (data-source aware)
├── lib/
│   ├── api/        client.ts: the ONLY place that calls fetch
│   ├── data/       dataSource.ts: preview vs api boundary
│   ├── config/     env.ts
│   └── utils/      cn, format, severity
├── mocks/          fixtures.ts (SIMULATED_DEMO) + parity test against data/demo/
├── types/          models matching contracts/openapi/openapi.yaml
├── styles/         globals.css (Tailwind layers, motion)
└── test/           setup + render/fetch helpers
```

**Design system.** Deep navy/charcoal surfaces (`ink-*`), one interactive accent (`signal`, cyan-blue), red reserved for
critical severity, green only for *verified* outcomes, amber (`sim`) only for simulated data. Tokens live in
`tailwind.config.ts`. Severity is always colour **and** a text label. Geist / Geist Mono are self-hosted. Layout: left
sidebar + top command bar (no bottom dock); below `lg` the sidebar becomes a horizontal nav. Motion is limited to
state changes and inferred-edge flow, and respects `prefers-reduced-motion`.

### Graph architecture (ADR-006 pending)

`features/graph/GraphCanvas.tsx` is a self-contained SVG + HTML renderer behind a small props contract
(`graph`, `selectedId`, `onSelect`, `highlight`, `origin`). Layout (`layout.ts`) is deterministic and presentation-only.
When ADR-006 is accepted, a React Flow implementation only has to honour the same `GraphCanvasProps`; `SecurityGraphView`
and `NodeInspector` do not change.

Visual encoding: asset nodes solid, finding nodes dashed, verified edges solid blue, inferred edges dashed cyan with a
confidence label, highlighted potential-path edges red, simulated nodes carry a flask mark.

---

## 4. API integration

All HTTP lives in `src/lib/api/client.ts`, typed against `contracts/openapi/openapi.yaml` (bare JSON, camelCase).

| Function | Request | Notes |
| :--- | :--- | :--- |
| `getHealth()` | `GET /health` | Drives the command-bar connection indicator (polled every 20 s) |
| `getAssets()` | `GET /assets` | |
| `getFindings(query?)` | `GET /findings?severity&asset_id` | |
| `getSecurityGraph()` | `GET /graph` | |
| `getAttackPaths()` | `GET /attack-paths` | **Not declared in `openapi.yaml`** (see limitations) |
| `getRemediations()` | `GET /remediations` | |
| `approveRemediation(id, body)` | `POST /remediations/{id}/approve` | Human approval gate |
| `resetDemo()` | `POST /demo/reset` | Declared by OpenAPI |

Errors are classified (`network`, `timeout`, `unavailable` for 404/405/501, `http`, `parse`) and rendered as safe
messages only: never response bodies, stack traces or internals. Each request has an 8 s timeout, so nothing spins
forever. A 2xx response with the wrong shape is a visible error, not a success.

**Data-source boundary.** Views call `useSourceData()`, which resolves to either `previewDataSource` (local fixtures) or
`apiDataSource` (the client). Switching needs no page changes.

**Honest states.**
- Connection indicator: `Connecting…` → `Backend online` / `Backend unavailable`, driven only by the real `/health` result.
- Reset: success is shown **only** after the backend returns a valid 2xx body. Offline, 404, bad shape and 5xx all show "Nothing was reset".
- Remediation: "Verified" appears **only** when the backend reports `status = APPLIED` **and** `verificationStatus = PASSED`.
  Opening a diff or clicking approve never advances any stage. In preview mode, approval sends nothing and says so.

---

## 5. Mock data and provenance

`src/mocks/fixtures.ts` mirrors the documented scenario in `data/demo/scenario.json` and `relationships.json`.
Everything carries `SIMULATED_DEMO` provenance: findings use `provenance: "SIMULATED"` (the OpenAPI enum) and attack
paths use `isSimulated: true`. A test (`fixtures.test.ts`) reads the real `data/demo/*.json` files and fails if the
fixtures drift, if any finding is not simulated, or if secrets/CVE ids appear. Nothing is invented: unspecified values
are omitted. A persistent banner and badges mark preview data whenever it is shown.

Preview-only additions (not in the scenario files) are marked in the source: the graph payload layout, masked evidence
excerpts, and two illustrative remediation diffs (the IAM diff uses an explicit `<scoped-staging-bucket>` placeholder).

---

## 6. Testing

`npm test` runs 60 tests: routing and active nav state, offline usability, preview provenance, `/health` reflection,
error/empty/retry states, no leakage of server error bodies, reset honesty, approval honesty, lifecycle rules, API
client classification, and fixture parity with `data/demo/`.

---

## 7. Current limitations

- **No live data yet.** The backend is still scaffolding (the health route exists; graph/findings return placeholders).
- **`GET /attack-paths` is missing from `openapi.yaml`.** The UI shows "not available on the backend yet" in API mode.
- **Graph is a preview renderer:** no drag, zoom or minimap until ADR-006 is accepted.
- **Contract gaps** (reported, not worked around): no `category` on Finding (the Category column is derived from the
  scanner name for display only), no evidence endpoint, no `chokePointAssetId` in `attack-path.schema.json`, no
  remediation execute/verify endpoints.
- No authentication headers are sent (the documented `X-API-Key` is not part of OpenAPI).
- Not audited with a screen reader; keyboard and ARIA basics are in place.

---

## 8. Strict frontend boundaries

1. **No Backend Business Logic:** Risk calculation, graph traversal and normalization stay on the backend.
2. **No Direct HexStrike Connection:** The frontend never connects to HexStrike or its MCP server.
3. **No Secrets in Environment Variables:** Only `VITE_API_BASE_URL` / `VITE_DATA_SOURCE` are configured; both are public.
4. **Contract-First:** Types follow [`contracts/openapi/openapi.yaml`](../../contracts/openapi/openapi.yaml). Contract changes go through joint review.
