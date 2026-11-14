# Backend Application — Domain-Vihaan_X (`apps/backend`)

> **Primary Owner:** Developer A (Lead Backend, Security, and Graph Engineer)  
> **Framework:** FastAPI (Python 3.11+)  
> **Key Architecture Decisions:** ADR-001 (FastAPI), ADR-002 (In-Memory / SQLite Graph), ADR-005 (Safe Human-in-the-Loop Remediation), ADR-011 (Demo vs Live Separation), ADR-012 (Resilient Backend with Rule-Based Fallback)

---

## 1. Overview and Responsibilities

`apps/backend` contains the core control plane, scanning orchestration, finding normalization, graph construction, attack-path intelligence, and remediation generation engine.

### Developer A Primary Scope:
- **API Endpoints:** Implement REST endpoints adhering to `contracts/openapi/openapi.yaml` and `docs/02-architecture/API_CONTRACT.md`.
- **Operating Modes:**
  - `DEMO_MODE`: Instantaneous synthetic scenario loading (`app/demo/provider.py` reading `data/demo/`).
  - `LIVE_ASSESSMENT_MODE`: Safe, sandboxed CLI execution of scanners (Gitleaks, Checkov, Trivy, Subfinder) with strict input validation.
- **Intelligence Engine:**
  - Graph model (`app/intelligence/asset_graph.py`) using NetworkX.
  - Risk prioritization and cross-domain attack path deduction (`app/intelligence/attack_path.py`).
- **Resilience & Fallbacks:**
  - Rule-based deterministic attack path and remediation synthesis (`app/ai/rule_fallback.py`) if external LLM/API keys are absent or unreachable.
  - Graceful degradation when scanners timeout or fail.
- **Safety Boundaries:**
  - Enforcement of target allowlist in `app/core/safety.py`.
  - Zero arbitrary shell injection; strict parameterized execution (`shell=False`).

---

## 2. Directory Structure

```
apps/backend/
├── README.md                           # This guide
├── pyproject.toml                      # Modern Python packaging and dependency config
├── requirements.txt                    # Pinned core dependencies
├── .env.example                        # Backend environment variable blueprint
├── app/
│   ├── main.py                         # FastAPI bootstrap, CORS, exception handlers, lifespan
│   ├── core/                           # Configuration, structured logging, safety boundaries, exceptions
│   │   ├── config.py                   # Pydantic Settings & environment validation
│   │   ├── logging.py                  # Structured console logger
│   │   ├── exceptions.py               # Domain exceptions & Starlette/HTTP exception handlers
│   │   └── safety.py                   # Target allowlist & input sanitization
│   ├── api/
│   │   └── v1/
│   │       ├── router.py               # Aggregated V1 API router
│   │       └── endpoints/              # Endpoint modules (health, assets, assessments, etc.)
│   │           └── health.py           # GET /api/v1/health (Honest scanner telemetry & mode)
│   ├── schemas/                        # Pydantic V2 schemas matching shared contracts
│   ├── models/                         # Persistent entities (SQLAlchemy/SQLite)
│   ├── database/                       # Database engine and session lifecycle
│   ├── repositories/                   # Data access layer
│   ├── services/                       # Application business logic
│   ├── integrations/
│   │   └── scanners/                   # Scanner adapters (base, gitleaks, checkov, etc.)
│   ├── orchestration/                  # Multi-scanner execution runner and progress tracker
│   ├── intelligence/                   # Normalization, Graph builder, Risk engine, Attack-path builder
│   ├── ai/                             # LLM security analyst and deterministic rule fallback
│   ├── remediation/                    # Patch generation, script generation, and dry-run verifier
│   ├── demo/                           # Synthetic demo scenario loader and reset logic
│   └── utils/                          # Common helpers
└── tests/                              # Pytest test suite
    ├── conftest.py                     # TestClient and session fixtures
    └── test_health.py                  # Health API, CORS, schema & exception tests
```

---

## 3. Local Development

### Environment Setup
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```
3. Run the development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
4. Access interactive API documentation at:
   - OpenAPI UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`
   - OpenAPI JSON Schema: `http://localhost:8000/openapi.json`
   - Canonical Health Check: `http://localhost:8000/api/v1/health`
   - Canonical Demo Reset: `http://localhost:8000/api/v1/demo/reset` (POST)

---

## 4. Testing Protocols

Run tests using pytest:
```bash
python -m pytest apps/backend/tests -v
```

All test assertions operate on actual fixture returns or deterministic outputs. Fabricating test passes is strictly prohibited by [`AGENTS.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/AGENTS.md).
