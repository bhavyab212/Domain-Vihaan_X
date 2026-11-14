# Multi-Tier Quality & Test Verification Plan — Domain-Vihaan_X

> **Document ID:** TEST-001  
> **Project Name:** Domain-Vihaan_X  
> **Domain:** Cybersecurity (VIHAAN X Hackathon)  
> **Document Status:** PROPOSED (Updated for Judging-First & 2x Repeatable Demo Strategy)  
> **Author:** Quality Assurance Lead & Cybersecurity Architect  
> **Last Updated:** 2026-11-15T00:36:00+05:30  
> **Target Release:** Hackathon MVP (v0.1.0)  
> **Core Strategic Philosophy:** **Frontend-first. Backend-reliable. Demo-driven.**  

---

## 1. Quality Strategy & Testing Hierarchy

To guarantee 100% demo stability, visual polish, and predictable backend execution under degraded evaluation conditions, **Domain-Vihaan_X** enforces a 5-tier verification hierarchy:

```
┌────────────────────────────────────────────────────────────────────────┐
│               TIER 5: 2x REPEATABLE LIVE DEMO REHEARSAL                │
│    Scripted 12-Stage Scenario Verified 2x Consecutively From Reset     │
├────────────────────────────────────────────────────────────────────────┤
│                 TIER 4: END-TO-END VERTICAL SLICE TESTS                │
│   FastAPI TestClient + Synthetic Fixtures (Reset -> Scan -> Rescan)    │
├────────────────────────────────────────────────────────────────────────┤
│            TIER 3: RESILIENCE & SUBSYSTEM INTEGRATION TESTS            │
│   HexStrike Offline Fallback | LLM Dropout Fallback | Subprocess Guard │
├────────────────────────────────────────────────────────────────────────┤
│                      TIER 2: API CONTRACT TESTS                        │
│    Dual-Mode Envelopes | Provenance Tags | Status Codes & Validation   │
├────────────────────────────────────────────────────────────────────────┤
│                        TIER 1: PURE UNIT TESTS                         │
│  Path DFS Algorithm | Contextual Risk Math | Sanitization | Redaction  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Test Execution Environment & Tooling

- **Backend Test Runner:** `pytest` (with `pytest-asyncio` and `pytest-timeout`).
- **API Test Client:** `httpx.AsyncClient` / FastAPI `TestClient`.
- **Database Fixture:** In-memory SQLite (`:memory:`) or dedicated test file (`test_vihaan.db`).
- **Synthetic Fixtures:** `test_env/mock_saas/` with synthetic AWS key and Terraform IAM policy.
- **Frontend Test Runner:** Vitest + React Testing Library (for UI state transitions and error boundaries).

---

## 3. Tier 1 & Tier 2: Unit, Contract & Dual-Mode Test Suite

| Test ID | Target Component | Test Description | Input Data | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **UT-001** | Risk Engine | Contextual Risk Score Math | Base severity `HIGH` (7.0), `PRODUCTION` (1.3), `PUBLIC` (1.4), no path bonus | Output equals $\min(10.0, 7.0 \times 1.3 \times 1.4) = 10.0$ | PROPOSED |
| **UT-002** | Risk Engine | Contextual Risk Score with Path Bonus | Base severity `MEDIUM` (4.5), `STAGING` (1.0), `INTERNAL` (1.0), `PathBonus` (+2.0) | Output equals $4.5 \times 1.0 \times 1.0 + 2.0 = 6.5$ | PROPOSED |
| **UT-003** | Sanitizer | Secret Redaction Filter | String containing `ghp_1234567890abcdefghijklmnopqrstuvwxyz` | Output masked: `ghp_123456****wxyz` | PROPOSED |
| **UT-004** | Normalizer | Gitleaks Parser | Raw Gitleaks JSON fixture containing 1 AWS key finding | Generates 1 `FindingSchema` object with `category="SECRET"`, `severity="CRITICAL"` | PROPOSED |
| **UT-005** | Normalizer | Checkov Parser | Raw Checkov JSON fixture containing `CKV_AWS_62` failure | Generates 1 `FindingSchema` object with `category="IAC"`, `severity="HIGH"` | PROPOSED |
| **UT-006** | Normalizer | Corrupted JSON Quarantine | Malformed JSON string `{"broken": ...` | Raises `NormalizationException`; returns graceful error without server crash | PROPOSED |
| **UT-007** | Graph Engine | NetworkX Model Instantiation | 3 Asset nodes, 2 Finding nodes, 3 directed edges | Graph verifies `number_of_nodes() == 5`, `number_of_edges() == 3` | PROPOSED |
| **UT-008** | Graph Engine | Cycle Detection Guard | Graph containing a cyclical edge dependency (`A -> B -> A`) | DFS traversal detects cycle and terminates without infinite recursion | PROPOSED |
| **API-001** | System Router | `/api/health` Verification | `GET /api/health` | Returns HTTP `200 OK`, `success=true`, `data.status="HEALTHY"` | PROPOSED |
| **API-002** | Demo Router | One-Click Reset Verification | `POST /api/demo/reset` | Resets SQLite tables, restores vulnerable `iam_staging.tf`, returns `status="RESET_SUCCESSFUL"` in < 1s | PROPOSED |
| **API-003** | Security Guard | Unauthorized Target Rejection | `POST /api/assessments` targeting `http://unauthorized.com` | Returns HTTP `403 Forbidden` with `TARGET_UNAUTHORIZED` code | PROPOSED |
| **API-004** | Provenance | Provenance Tag Verification | `GET /api/findings?mode=DEMO` | Every finding object verifies `provenance == "SIMULATED_DEMO"` | PROPOSED |

---

## 4. Tier 3: Resilience & Graceful Degradation Test Suite

| Test ID | Adverse Condition | Test Mechanism | Expected Platform Behavior | Status |
| :--- | :--- | :--- | :--- | :--- |
| **IT-RES-001** | **HexStrike Service Down** | Configure adapter with unreachable port `http://127.0.0.1:9999`. Trigger assessment. | Adapter catches `ConnectError`; logs warning; platform falls back immediately to native CLI runners; assessment completes cleanly. | PROPOSED |
| **IT-RES-002** | **External LLM Timeout / Disconnected** | Mock remote LLM client to raise `TimeoutException` or disconnect network. Trigger `POST /api/ai/analyze/{id}`. | Timeout guard catches exception; invokes embedded `RuleBasedExplanationEngine`; returns structured JSON kill-chain narrative in < 50ms with `offline_mode=true`. | PROPOSED |
| **IT-RES-003** | **Scanner Hanging Indefinitely** | Mock scanner subprocess runner invoking `sleep 65`. Trigger assessment. | Supervisor issues `SIGKILL` at 60.0s; database logs `ScanExecution(status="TIMED_OUT")`; API returns partial results without crash. | PROPOSED |
| **IT-RES-004** | **Corrupted Tool Output** | Inject non-JSON garbage string into tool stdout pipe. | Parser quarantines payload; logs `ScanExecution(status="FAILED")`; normalizer continues processing remaining scanner outputs. | PROPOSED |
| **IT-RES-005** | **Browser Refresh During Scan** | Client triggers scan and immediately re-queries `GET /api/assessments/{id}`. | State is read from SQLite database; progress percentage resumes without reset or error. | PROPOSED |

---

## 5. Tier 4 & Tier 5: 2x Repeatable Clean-State Demo Test Suite

This suite verifies the exact live hackathon demonstration scenario end-to-end and mandates that the full cycle can be repeated consecutively twice from a clean initial state.

```
DEMO REPEATABILITY TEST FLOW:
[Step 1: Reset Environment via POST /api/demo/reset]
       │
[Step 2: Trigger Assessment -> Findings Populated]
       │
[Step 3: Graph Renders -> 3-Hop Attack Path Active]
       │
[Step 4: AI Explains Kill Chain (Rule Fallback Ready)]
       │
[Step 5: Human Approves IAM Policy Diff]
       │
[Step 6: Controlled Patch Applied -> Re-scan Clears Finding]
       │
[Step 7: Attack Edge Severed -> Status VERIFIED_RESOLVED]
       │
       ▼
[TRIGGER POST /api/demo/reset AGAIN] ──► REPEAT STEPS 2-7 WITH 100% IDENTICAL RESULTS
```

### End-to-End Test Specification (`E2E-RPT-001`)

| Stage | Action | Expected Assertion |
| :--- | :--- | :--- |
| **Iteration 1: Init** | `POST /api/demo/reset` | DB seeded with 3 assets, 2 relationships; `iam_staging.tf` has `Resource = "*"`. |
| **Iteration 1: Scan** | `POST /api/assessments` | Generates `fnd_sec_01` (AWS Key) and `fnd_iac_01` (Checkov wildcard S3). |
| **Iteration 1: Graph** | `GET /api/graph/{id}` | In-memory graph detects path: `Repo -> Key -> Role -> S3`. Red attack edge rendered. |
| **Iteration 1: Remediate** | `POST /api/remediations/{id}/approve` & `execute` | Policy patched; re-scan clears `fnd_iac_01`; attack path status changes to `SEVERED`. |
| **Iteration 2: Reset** | `POST /api/demo/reset` | Status returns `RESET_SUCCESSFUL`; `iam_staging.tf` reverted to `Resource = "*"`; DB flushed. |
| **Iteration 2: Re-run** | Execute full scan and remediation flow again | Produces identical findings, identical graph topology, identical diff, and identical severed resolution. |

---

## 6. Pass / Fail Acceptance Gate for Hackathon

The platform is officially signed off as **READY FOR EVALUATION** only when:
1. All pure unit tests (`UT-001` through `UT-008`) pass with 0 failures.
2. All resilience tests (`IT-RES-001` through `IT-RES-005`) prove zero-crash graceful degradation.
3. The full 12-stage demo flow (`E2E-RPT-001`) executes cleanly **twice consecutively** from a clean reset state in under 5 minutes total.
4. Zero unhandled console errors or missing state skeletons in the frontend browser session.
