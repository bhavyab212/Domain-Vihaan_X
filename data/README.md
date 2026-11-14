# Data and Synthetic Fixtures (`data/`)

> **Operating Modes:** DEMO_MODE & LIVE_ASSESSMENT_MODE  
> **Reference Decisions:** ADR-011 (Demo vs Live Mode Separation), ADR-012 (Resilience Strategy)  
> **Governance:** [`AGENTS.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/AGENTS.md) Section 2 (Strict Factuality & Zero Fabrication)

---

## 1. Directory Structure and Purpose

```
data/
├── README.md                           # This guide
├── demo/                               # Deterministic synthetic fixtures for DEMO MODE
│   ├── scenario.json                   # Aggregated canonical demo scenario
│   ├── assets.json                     # Seeded digital assets
│   ├── findings.json                   # Seeded findings (tagged SIMULATED)
│   ├── relationships.json              # Inferred and verified graph edges
│   └── mock_saas/                      # Synthetic codebase and cloud config fixtures
│       ├── repo/config/staging.env     # Simulated leaked secret fixture
│       ├── iac/iam_staging.tf          # Simulated overprivileged Terraform role
│       └── storage/buckets.json        # Simulated S3 crown jewel asset
└── runtime/                            # Gitignored runtime storage
    └── .gitkeep                        # SQLite DB, scan artifacts, temp sandbox
```

---

## 2. Operating Mode Principles

### DEMO MODE (`DEFAULT_OPERATING_MODE=DEMO_MODE`)
- **Zero Internet / Zero LLM Dependency:** All data is loaded directly from `data/demo/` within 5 milliseconds.
- **Repeatable & Predictable:** Every judge walkthrough sees the exact same high-impact attack path.
- **Explicit Provenance:** All findings loaded from `data/demo/` carry `provenance: "SIMULATED"` and `isSimulated: true`.
- **One-Click Reset:** Calling `POST /api/v1/demo/reset` instantly restores the application to this baseline.

### LIVE ASSESSMENT MODE (`LIVE_ASSESSMENT_MODE`)
- **Authorized Execution Only:** Runs actual CLI scanners against targets in `settings.ALLOWED_TARGET_DOMAINS`.
- **Real Evidence:** Findings are tagged `provenance: "OBSERVED"` with raw stdout/stderr stored in `data/runtime/`.
- **Sandbox Isolation:** Scans run inside `data/runtime/sandbox/` to prevent contamination.
