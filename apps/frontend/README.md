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
| `/` | Security Command Center | Operating status (real `/health`, scanner states exactly as reported, last backend-confirmed reset), KPI tallies that link to filtered views, most-severe-path preview, domains, assets, finding-discovery timeline, recommendations. See "Command Center" |
| `/graph` | Business Security Graph | Interactive React Flow map (repository, secret finding, IAM role, cloud storage): drag, zoom, pan, fit view, minimap, node and relationship selection, inspectors, potential-path highlight |
| `/threats` | Threats & Findings | Triage workspace: category tabs, severity quick-filter, search, scanner / asset / status / provenance filters with removable chips, sortable columns, URL-restorable view, detail drawer with evidence and previous/next navigation. See "Findings center" |
| `/paths` | Attack Path Investigation | Path list plus an investigation drawer: ordered kill chain, per-step evidence, relationship type, choke point only if supplied, deep link `?p=<id>`, "Show on graph". Always labelled *inferred*. See "Attack path investigation" |
| `/remediation` | Remediation Studio | Queue, proposal facts (scope, size, placeholders), redacting diff viewer, confirmed human approval, lifecycle, verification; deep link `?r=<id>`. See "Remediation studio" |

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
| `nodes/AssetNode.tsx`, `nodes/IdentityNode.tsx`, `nodes/FindingNode.tsx` | Custom node cards (memoised) |
| `edges/AttackEdge.tsx` | Custom relationship edge with label, confidence and path flow (memoised) |
| `NodeInspector.tsx` | `NodeInspector` for a selected node and `EdgeInspector` for a selected relationship |

**Node model.** Asset cards (repository, cloud account, data store, target) show type, name, environment, criticality,
owner and one metadata line (branch, provider or ARN) **only when the data source supplies it**. Finding cards show title,
severity, scanner label, associated asset and a provenance badge. No evidence text, secret values or credentials are ever
rendered on a node (the masked excerpt lives in the Threats & Findings drawer). Asset records carry no provenance field in
the API contract, so the small flask mark on asset cards reflects the data source (local preview), not a per-asset claim.

**Identity nodes are never fabricated.** An `IdentityNode` is created only for a graph node whose payload `type` is
`"IDENTITY"`; a cloud account in an `ASSET` node stays an asset card. When the inventory record behind an identity has a
different name from the node label, the card also shows that real asset ("in cloud account aws-production-account"), so the
label can never stand in for it.

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

**Relationship selection.** Clicking an edge selects it and opens the relationship inspector: type, verified vs inferred,
confidence (only when supplied), both endpoints (clickable) and, when it is a hop of the highlighted path, a "not a
confirmed exploit" note. A node and a relationship are never selected at the same time, and clicking the empty canvas
clears both. The canvas wires this only when given `onSelectEdge`, so `GraphCanvasProps` stays backward compatible.

---

## 3b. Findings center (`/threats`)

| File | Responsibility |
| :--- | :--- |
| `triage.ts` | **Pure** filtering, sorting and tab counts. Only hides or reorders records the API returned; no scoring |
| `urlState.ts` | Triage state to and from URL search params; defensive parsing, defaults omitted from the URL |
| `categories.ts` | The single centralised scanner to category mapping (display and filtering only) |
| `FindingsView.tsx` | Composes the above, owns URL state and drawer navigation |
| `CategoryTabs`, `SeverityStrip`, `FilterBar`, `FindingsTable`, `FindingDrawer` | Presentation |

**Categories are derived, not backend data.** The OpenAPI `Finding` has no `category` field (nor does the newest unmerged
backend contract), so the category is derived from the scanner (gitleaks: Secret, checkov: IaC, trivy: Vulnerability,
subfinder: External surface, anything else: Other). It is a display and filter convenience only. If the backend adds a
canonical field, `categoryIdOf` in `categories.ts` is the only place that changes.

**Filters really filter.** The category tabs and severity strip are filters, not decoration: each count already reflects
every *other* active filter, so the number on a tab always equals the rows clicking it would show. Search covers title,
description, id, scanner, asset name and file/resource. SIMULATED_DEMO and the legacy SIMULATED are one "Simulated demo"
provenance group, distinct from Observed and Inferred.

**Sorting.** Severity, finding, source and discovered are sortable (`aria-sort`, keyboard-operable). The default is most
severe first then newest; ties break deterministically so order never depends on input order.

**Shareable view.** Filters, sort and the open finding live in the URL (`?category=IAC&sort=title&dir=asc&f=find-sec-01`).
Reloading or sharing restores the view. Opening a finding is a history entry (Back closes the drawer); filter and sort
changes replace the entry. A link to a finding absent from the current data source says so rather than failing silently.

**Drawer.** Provenance note (simulated, observed or inferred), CVSS and CVE only when supplied, asset, file and resource,
masked evidence excerpt, remediation guidance. Previous / next walks the *filtered, sorted* list (also `j` / `k`).

**Data source.** In API mode the table shows backend findings only. A failed request shows an error with retry and never
falls back to fixtures; preview findings appear only when preview is explicitly selected.

---

## 3c. Command Center (`/`)

| File | Responsibility |
| :--- | :--- |
| `posture.ts` | **Pure** tallies. No score, trend or velocity exists anywhere (a test asserts none of those words render) |
| `StatusStrip.tsx` | Operating status. Sits **outside** the data boundary so "connecting" and "unavailable" are visible exactly when they matter |
| `KpiGrid.tsx`, `PathPreview.tsx` | KPI tiles and the most-severe-path kill-chain preview |

- **Every number is a count of records the source returned**, and each KPI links to the view that lists exactly those records
  (`/threats?severity=CRITICAL` when a critical exists).
- **Unavailable is not zero.** A failed optional endpoint (attack paths, remediations) renders a dash with a reason; a
  genuinely empty backend renders 0.
- **Real-backend shape.** Dev A's backend currently returns empty `/assets` and `/findings` while the graph is populated, so
  assets are counted from the graph and labelled "named by the graph"; the findings the graph reports are shown **without
  inventing a severity breakdown**.
- **Status.** Backend state is the real `/health` result (never green by default); the operating mode is shown only while the
  backend is online; scanner states are shown exactly as reported, and `unverified` is **never** shown as healthy.
- **Reset.** One shared `ResetDemoControl`: click, read what will happen, confirm, pending, then a backend-validated result. **Preview
  mode never sends `POST /demo/reset`**; it says so and is neither green nor red. "Last reset" comes only from a
  backend-confirmed `resetAt`.

---

## 3d. Attack path investigation (`/paths`)

- `pathModel.ts` (pure) **resolves** ids the backend supplied into display facts. It discovers, ranks and scores nothing, and
  it never fills a gap: an unknown asset or finding falls back to its bare id.
- Verified against the **real backend payload** (`src/test/realBackend`): an empty inventory resolves from the graph, the final
  step's `findingId: null` means "no finding" (never the string "null"), graph-only findings carry **no invented provenance**
  and are not offered as openable in Threats & Findings.
- The drawer shows the inferred-not-a-confirmed-exploit notice at the top, the kill chain (each hop is a real button with
  `aria-expanded`), technique and MITRE tactic exactly as supplied and labelled descriptive, the relationship into each step
  (inferred vs recorded, confidence only when supplied), and the choke point only when `chokePointAssetId` is supplied.
- **AI analysis is inert.** No AI endpoint exists in the contract and the backend answers 404, so the panel makes no request and
  writes no text. It states what will appear once an endpoint is published.
- Deep links: `/paths?p=<id>` and `/graph?path=<id>` (the graph selects and highlights exactly that path, or says it does not
  exist). Ids are parsed defensively and rendered as text.

---

## 3e. Remediation studio (`/remediation`)

- **Approval is a deliberate two-step.** The form collects approver and rationale; "Review and approve" opens a confirmation that
  states the exact scope (files from the diff), change size, approver, and what approval does **not** prove. Only that
  confirmation sends anything, and Cancel is the initial focus.
- **The reply is validated before it is trusted** (`checkApprovalResponse`): same remediation id, a status the contract defines. A
  2xx that still says `PENDING` is shown as "no approval recorded". Failures are specific (501, 404, 409/412 stale, 422,
  network) and never render server bodies. Duplicate submits are blocked by a synchronous ref guard.
- **Reject and Execute are deliberately inert.** The contract defines no reject or execute operation; a button that only changed
  local state would fabricate a decision. Reject is shown disabled with its reason; there is no Execute control.
- **Green means verified-remediated and nothing else**: backend `APPLIED` + `PASSED`. Completed lifecycle stages and `+` diff lines are
  deliberately not green, and a test asserts nothing else in `<main>` is.
- **`DiffViewer` redacts secret-shaped values** before display and before copy, and says when it did. The backend is expected to
  mask evidence; the UI does not rely on that. Shell scripts are never displayed or run.
- The verification panel shows the raw backend enums and says re-assessment evidence is **not provided by the contract**; there
  is no field for a reassessment id, scanner comparison or timestamp, so none is shown.

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
- **Timestamps.** The backend emits ISO strings **without a timezone**; JavaScript would read them as the viewer's local time and
  shift every displayed time. `parseApiDate` treats a zone-less ISO string as UTC.

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

`npm test` runs 483 tests across 22 files: routing and active nav state, offline usability, preview provenance, `/health`
reflection, error/empty/retry states, no leakage of server error bodies, reset honesty and response validation, approval
honesty, lifecycle rules, API client classification, a git-index import guard, and fixture parity with `data/demo/`.

Graph coverage (`features/graph`): pure model tests (layout determinism and no-overlap, node and edge building, identity
honesty, selection and path styling, animation only on active-path edges, reduced motion), canvas tests (node and edge
counts, zoom controls, selection by click and keyboard, empty / single-node / broken-edge graphs, custom node content,
dashed vs solid edges, path highlighting) and view tests (preview vs API data source, error / empty / 404 handling, no
request loop, relationship selection and both inspectors).

Findings coverage (`features/findings`): pure triage tests (every filter and combination, search fields, every sort and
stability, tab counts), URL state tests (round trip, malformed and hostile input), and view tests (table, tabs, strip,
chips, clear-all, drawer, previous/next, deep links, API mode never using fixtures, loading / error / empty states).

Command Center / paths / remediation coverage: posture tallies against preview **and the captured real backend payload**; status
honesty (connecting, unavailable, online, scanner states); every KPI's link target; the 9-case remediation green matrix with a
page-wide "nothing else is green" assertion; approval confirm/cancel/duplicate/failure matrix; path model, kill chain and deep
links; redaction; shared dialog focus trap and stacked-Escape. The honesty-critical rules were **mutation-checked** (break the
rule, see red, restore, see green): 4 on the Command Center, 8 on paths, 10 on remediation, plus the reset preview guard and
the dialog stack guard. Two mutations initially survived, which exposed weak tests that were then rewritten.

`src/test/realBackend/*.json` are payloads **captured from Dev A's running backend** (`backend/TSK-009-011-014-security-operations`
@ `c68502d`, run read-only from a temporary export), not hand-written fixtures. A contract test fails if the shape drifts.

jsdom has no layout engine, so `src/test/setup.ts` shims `ResizeObserver` and `DOMMatrixReadOnly`, and defaults a missing
`UIEvent.view` to `window` (user-event sends `null`, which d3-drag cannot handle). These let React Flow mount; they do
**not** measure real pixels. Overlap, clipping and mobile fit were checked separately in headless Chrome.

---

## 7. Current limitations

- **Verified against Dev A's backend only as far as it goes.** On `backend/TSK-009-011-014-security-operations` (unmerged) the graph,
  attack-paths, health and demo-reset endpoints return real data, but `GET /assets`, `GET /findings` and `GET /remediations`
  are placeholders returning `[]`, `POST /remediations/{id}/approve` returns 501, and assessments polling returns 501. So the
  findings table, remediation queue and approval cannot be exercised end to end against it yet. The UI shows honest empty or
  unavailable states for those.
- **`GET /attack-paths` is missing from `openapi.yaml`** (it exists on Dev A's unmerged branch). The UI shows "not available on
  the backend yet" when the integrated contract's backend lacks it.
- **No AI analysis, reject, execute, verify or re-assessment endpoint exists** in the contract or the backend, so those panels
  are inert and say so.
- **Graph layout is fixed, not auto-routed:** drag positions are not persisted across reloads, and edge routing is
  computed from the initial layout (dragging a node does not change which side an edge leaves from).
- **The graph has been checked against the real backend payload** (3 asset nodes, plus 2 finding nodes with `include_findings=true`, a parameter that is not in the OpenAPI contract and defaults to false). Without it, API mode shows no finding cards.
- **Contract gaps** (reported, not worked around): no `category` on Finding (derived from the scanner name for display
  and filtering only), no evidence endpoint, no `chokePointAssetId` in `attack-path.schema.json`, no remediation
  execute/verify endpoints.
- **The findings table is not paginated or virtualised.** That is deliberate for today's data volume; revisit if a backend
  returns hundreds of findings.
- **Table and graph state are not shared yet:** selecting a finding does not select its graph node (a deep link goes the
  other way: graph inspector to `/threats?f=<id>`).
- No authentication headers are sent (the documented `X-API-Key` is not part of OpenAPI).
- Not audited with a screen reader; keyboard and ARIA basics are in place. Dialogs trap focus, restore it to the opener (checked with real mouse and keyboard input in headless Chrome), and close on Escape. Browser checks were Chrome only.

---

## 8. Strict frontend boundaries

1. **No Backend Business Logic:** Risk calculation, graph traversal and normalization stay on the backend.
2. **No Direct HexStrike Connection:** The frontend never connects to HexStrike or its MCP server.
3. **No Secrets in Environment Variables:** Only `VITE_API_BASE_URL` / `VITE_DATA_SOURCE` are configured; both are public.
4. **Contract-First:** Types follow [`contracts/openapi/openapi.yaml`](../../contracts/openapi/openapi.yaml). Contract changes go through joint review.
