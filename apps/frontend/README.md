# Domain-Vihaan_X — Frontend Application (`apps/frontend`)

> **Owner:** Developer B (Frontend & Product Engineering)  
> **Framework:** React 18 + Vite + TypeScript + Tailwind CSS  
> **Key Libraries:** React Flow (`@xyflow/react`), Lucide React  
> **Core Doctrine:** **Frontend-first. Backend-reliable. Demo-driven.**  

---

## 1. Module Overview & Responsibilities

This directory contains the single-page web client for **Domain-Vihaan_X**. It is owned exclusively by Developer B.

### Primary Responsibilities
1. **Security Command Center (`src/features/overview/`):** Executive posture dashboard, risk velocity metrics, mode toggle, and scenario reset trigger.
2. **Business Security Graph (`src/features/attack-paths/`):** Signature interactive React Flow canvas with custom `AssetNode` cards, pulsating red attack edges, minimap, and inspector drawer.
3. **Threat & Findings Center (`src/features/findings/`):** High-density triage table with category tabs (`Secret`, `IaC`, `SCA`), severity filters, and raw evidence inspection drawers.
4. **Attack Path Investigation (`src/features/attack-paths/`):** Step-by-step kill-chain walkthrough with choke-point analysis and AI risk narrative card.
5. **AI Remediation Center Studio (`src/features/remediation/`):** Unified code diff viewer, human approval modal, and live verification re-scan status.

---

## 2. Directory Layout

```
apps/frontend/
├── public/
│   ├── icons/                               # Vector SVG security & asset icons
│   └── images/                              # Static visual branding assets
├── src/
│   ├── app/                                 # Application bootstrap & routing
│   │   ├── App.tsx                          # Root layout container & error boundary
│   │   ├── router.tsx                       # Route definitions for 5 primary views
│   │   └── providers/                       # React Query / Theme / Context providers
│   ├── components/                          # Shared UI component library
│   │   ├── ui/                              # Atoms: Button, Card, Badge, Modal, DiffViewer
│   │   ├── layout/                          # Header, Sidebar, NavigationBar
│   │   └── common/                          # StatusIndicator, LoadingSkeleton, ErrorBoundary
│   ├── features/                            # Feature-sliced modules
│   │   ├── overview/                        # Command Center widgets & KPI cards
│   │   ├── assets/                          # Asset inventory table & register dialog
│   │   ├── assessments/                     # Assessment launcher & progress stepper
│   │   ├── findings/                        # Triage table & raw evidence slide-out
│   │   ├── attack-paths/                    # React Flow graph canvas & custom nodes
│   │   └── remediation/                     # Policy diff studio & human approval modal
│   ├── lib/                                 # Client infrastructure & utilities
│   │   ├── api/                             # Typed API client mapping to OpenAPI contract
│   │   ├── config/                          # Application environment constants
│   │   └── utils/                           # Formatters, class merge (clsx/tailwind-merge)
│   ├── hooks/                               # Custom React hooks (useGraph, useScanStatus)
│   ├── types/                               # TypeScript interfaces generated from contracts
│   ├── styles/                              # Tailwind CSS global stylesheet & theme tokens
│   └── mocks/                               # Offline JSON fixtures for contract-first development
├── package.json                             # Dependencies & scripts
├── vite.config.ts                           # Vite configuration with path aliases
├── tsconfig.json                            # Strict TypeScript compiler options
├── index.html                               # HTML5 entrypoint
└── .env.example                             # Local frontend environment blueprint
```

---

## 3. Strict Frontend Boundaries

1. **No Backend Business Logic:** Risk calculation, graph traversal, and normalization are performed on the backend. The frontend is strictly a presentation consumer.
2. **No Direct HexStrike Connection:** The frontend never connects to HexStrike or its MCP server directly.
3. **No Secrets in Environment Variables:** Only `VITE_API_BASE_URL` is configured via environment. Never expose private API keys in client bundles.
4. **Contract-First Mocking:** During Milestone 1, develop against static mock fixtures in `src/mocks/` matching [`contracts/openapi/openapi.yaml`](../../contracts/openapi/openapi.yaml).
