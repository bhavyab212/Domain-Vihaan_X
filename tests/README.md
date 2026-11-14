# Cross-Tier Test Suite (`tests/`)

> **Reference Specification:** [`docs/04-quality-and-security/TEST_PLAN.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/04-quality-and-security/TEST_PLAN.md)  
> **Governance:** [`AGENTS.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/AGENTS.md) Section 2 (Zero Fabrication & Strict Factuality)

---

## 1. Test Architecture

The test suite is organized into three distinct validation tiers:

| Tier | Directory | Scope | Execution Trigger |
| :--- | :--- | :--- | :--- |
| **Contract Tests** | [`tests/contract/`](file:///d:/REAL_projects/Domain-Vihaan%20X/tests/contract/) | Validates backend API responses against `contracts/schemas/` | Pre-commit & CI |
| **End-to-End Tests** | [`tests/e2e/`](file:///d:/REAL_projects/Domain-Vihaan%20X/tests/e2e/) | Validates complete user journeys across the 5 Primary Views | Pre-release |
| **Demo Verification** | [`tests/demo/`](file:///d:/REAL_projects/Domain-Vihaan%20X/tests/demo/) | Validates 100% deterministic demo scenario repeatability and offline execution | Pre-demo check |

Unit and integration tests for specific applications live within their respective workspaces:
- Frontend Unit/Component Tests: `apps/frontend/src/**/*.test.tsx`
- Backend Unit/Integration Tests: `apps/backend/tests/`
