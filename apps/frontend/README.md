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
| `@xyflow/react` 12.12 | Interactive Business Security Graph canvas (ADR-006, accepted for the hackathon MVP). MIT licence; peer dependency `react >= 17`, so React 18.3 is supported |
| `vitest`, `jsdom`, `@testing-library/*` | Frontend test foundation |

Bundle impact of React Flow (measured with `npm run build`): JS 298.9 kB to 496.7 kB (gzip 89.5 to 154.6 kB), CSS 28.6 kB
to 45.0 kB (gzip 6.3 to 8.8 kB), about +65 kB gzip. Acceptable for a local-first demo. Only the graph route needs it, so it
is a candidate for `React.lazy` code-splitting if load time ever matters.

---

## 2. Routes

| Route | View | Purpose |
| :--- | :--- | :--- |
| `/` | Security Command Center | Findings tallied by severity, potential attack paths, MVP domain overview, asset inventory, recent activity, priority recommendations |
| `/graph` | Business Security Graph | Interactive React Flow map (repository, secret finding, IAM role, cloud storage): drag, zoom, pan, fit view, minimap, node selection, inspector, potential-path highlight |
| `/threats` | Threats & Findings | Search/filter table, severity, category, asset, scanner, provenance, detail drawer with evidence and guidance |
| `/paths` | Attack Path Investigation | Entry point → steps → target, choke point, evidence references, confidence; always labelled *inferred* |
| `/remediation` | Remediation Studio | Queue, recommended fix, unified diff, human approval, lifecycle stepper, verification result |

Unknown routes render a "Page not found" state, never a blank page.

---

## 3. UI architecture

```
src/
├── app/            App.tsx, router.tsx, routerFuture.ts, main.tsx
│   └── providers/  DataSourceProvider (preview|api), BackendStatusProvider (real /health), DemoResetProvider (validates DemoResetResponse)
├── components/
│   ├── ui/         Button, Badge, Panel (design-system atoms)
│   ├── layout/     AppShell, Sidebar, CommandBar, Banners, navigation
│   └── common/     SeverityBadge, ProvenanceBadge, States (skeleton/empty/error), AsyncBoundary, Drawer, DiffViewer, ...
├── features/       overview, graph, findings, attack-paths, remediation (one folder per primary interface)
│   └── graph/      GraphCanvas (React Flow), model.ts (pure data prep), layout.ts, nodes/, edges/, NodeInspector, SecurityGraphView
├── hooks/          useAsyncData (3-state loading), useSourceData (data-source aware), useReducedMotion
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

### Graph architecture (ADR-006 accepted for the hackathon MVP)

**Decision.** React Flow (`@xyflow/react`) renders the graph. Why: declarative React components, custom node and edge
renderers styled with Tailwind, built-in pan/zoom/drag/minimap/keyboard handling that FR-014 and NFR-001 need, MIT licence,
React 18 compatible. `DECISIONS.md` is a shared document, so the status change is proposed in the PR description for
Developer A to consolidate rather than edited here.

**Boundary.** `SecurityGraphView` and `NodeInspector` depend only on the `GraphCanvasProps` contract (`graph`, `assets`,
`findings`, `selectedId`, `onSelect`, `highlight`, `origin`). Swapping the renderer again would not touch them.

| File | Responsibility |
| :--- | :--- |
| `model.ts` | **Pure** data preparation (no React or DOM): backend graph + assets + findings to React Flow nodes and edges; selection and path styling; edge side routing. Unit-tested without rendering |
| `layout.ts` | Deterministic layered layout (no randomness or physics): non-finding nodes flow left to right by dependency depth; findings hang under the node that exposes them |
| `GraphCanvas.tsx` | React Flow wiring: controls, minimap, fit view, drag state, keyboard selection, path focus |
| `nodes/AssetNode.tsx`, `nodes/FindingNode.tsx` | Custom node cards (memoised) |
| `edges/AttackEdge.tsx` | Custom relationship edge with label, confidence and path flow (memoised) |

**Node model.** Asset cards show type (repository, cloud account, data store, identity, target), name, environment,
criticality and one metadata line (branch, provider or ARN) **only when the data source supplies it**. Finding cards show
title, severity, scanner label, associated asset and a provenance badge. No evidence text, secret values or credentials are
ever rendered on a node (the masked excerpt lives in the Threats & Findings drawer). Asset records carry no provenance
field in the API contract, so the small flask mark on asset cards reflects the data source (local preview), not a per-asset
claim.

**Edge model.** Styling comes from the backend's own `inferred` flag, never from guesswork.

| Edge | Treatment |
| :--- | :--- |
| Verified (recorded) relationship | Solid blue, label plus `verified` |
| Inferred relationship | **Dashed** cyan, label plus `inferred · NN%` when a confidence is supplied |
| Highlighted potential attack path | Red and thicker; **flows (animated) only on these edges** |

The dash style alone separates inferred from verified, so no meaning depends on colour or motion. Under
`prefers-reduced-motion` nothing animates, but the path stays highlighted. Highlighting is built from ids the backend
supplied in `AttackPath.steps`; the UI does not discover or score paths.

**Interaction.** Drag nodes (positions only; they survive selection changes and reset when the graph itself changes),
wheel/pinch zoom, pan, zoom +/- and fit-view buttons, minimap (hidden below `sm`). Selecting a node (click, or Enter/Space
when focused) updates the inspector and highlights its connected relationships while dimming the rest. "Highlight potential
path" focuses the camera on the path nodes while keeping the rest of the graph visible, and labels it *not a confirmed
exploit*. Nodes are keyboard-focusable with descriptive `aria-label`s, and the canvas announces node and relationship
counts. React Flow's small "React Flow" attribution is kept at the bottom of the canvas (MIT licence, no Pro subscription).

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
| `resetDemo()` | `POST /demo/reset` | Returns a validated `DemoResetResponse` (see "Honest states") |

Errors are classified (`network`, `timeout`, `unavailable` for 404/405/501, `http`, `parse`) and rendered as safe
messages only: never response bodies, stack traces or internals. Each request has an 8 s timeout, so nothing spins
forever. A 2xx response with the wrong shape is a visible error, not a success.

**Data-source boundary.** Views call `useSourceData()`, which resolves to either `previewDataSource` (local fixtures) or
`apiDataSource` (the client). Switching needs no page changes.

**Honest states.**
- Connection indicator: `Connecting…` → `Backend online` / `Backend unavailable`, driven only by the real `/health` result.
- Reset: green success requires HTTP 2xx **and** a valid `DemoResetResponse` **and** `status === "RESET_SUCCESSFUL"` **and**
  `mode === "DEMO_MODE"` (all counts non-negative integers, `walVerified` a boolean, `resetAt` a real date). Offline, 404, a
  malformed or legacy-shaped 2xx, `RESET_FAILED`, a wrong mode and 5xx all show "Nothing was reset". The success message is
  built from the validated counts only and never echoes `runtimeWorkspace` or backend text.
- Remediation: "Verified" appears **only** when the backend reports `status = APPLIED` **and** `verificationStatus = PASSED`.
  Opening a diff or clicking approve never advances any stage. In preview mode, approval sends nothing and says so.

---

## 5. Mock data and provenance

`src/mocks/fixtures.ts` mirrors the documented scenario in `data/demo/scenario.json` and `relationships.json`.
Everything carries `SIMULATED_DEMO` provenance: findings use `provenance: "SIMULATED_DEMO"` (canonical in the TSK-002
contract; the legacy `SIMULATED` is still accepted and rendered as simulated) and attack
paths use `isSimulated: true`. A test (`fixtures.test.ts`) reads the real `data/demo/*.json` files and fails if the
fixtures drift, if any finding is not simulated, or if secrets/CVE ids appear. Nothing is invented: unspecified values
are omitted. A persistent banner and badges mark preview data whenever it is shown.

Preview-only additions (not in the scenario files) are marked in the source: the graph payload layout, masked evidence
excerpts, and two illustrative remediation diffs (the IAM diff uses an explicit `<scoped-staging-bucket>` placeholder).

---

## 6. Testing

`npm test` runs 164 tests across 8 files: routing and active nav state, offline usability, preview provenance, `/health`
reflection, error/empty/retry states, no leakage of server error bodies, reset honesty and response validation, approval
honesty, lifecycle rules, API client classification, a git-index import guard, and fixture parity with `data/demo/`.

Graph coverage (`features/graph`): pure model tests (layout determinism and no-overlap, node and edge building, selection
and path styling, animation only on active-path edges, reduced motion) and canvas tests (node and edge counts, zoom
controls, selection by click and keyboard, inspector round-trip, empty / single-node / broken-edge graphs, custom node
content, dashed vs solid edges, path highlighting).

jsdom has no layout engine, so `src/test/setup.ts` shims `ResizeObserver` and `DOMMatrixReadOnly`, and defaults a missing
`UIEvent.view` to `window` (user-event sends `null`, which d3-drag cannot handle). These let React Flow mount; they do
**not** measure real pixels. Overlap, clipping and mobile fit were checked separately in headless Chrome.

---

## 7. Current limitations

- **No live data yet.** The backend is still scaffolding (the health route exists; graph/findings return placeholders).
- **`GET /attack-paths` is missing from `openapi.yaml`.** The UI shows "not available on the backend yet" in API mode.
- **Graph layout is fixed, not auto-routed:** drag positions are not persisted across reloads, and edge routing is
  computed from the initial layout (dragging a node does not change which side an edge leaves from).
- **Graph is not tested against live backend graph data** (the backend `/graph` route returns placeholders for now).
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
