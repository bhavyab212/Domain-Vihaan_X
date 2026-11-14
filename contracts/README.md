# Shared API and Data Contracts (`contracts/`)

> **Joint Ownership:** Developer A (Backend) & Developer B (Frontend)  
> **Status:** ACTIVE & CONTRACT-FIRST MANDATORY  
> **Reference Documentation:** [`docs/02-architecture/API_CONTRACT.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/02-architecture/API_CONTRACT.md) & [`docs/02-architecture/DATA_MODEL.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/docs/02-architecture/DATA_MODEL.md)

---

## 1. Contract-First Collaboration Principle

In accordance with [`AGENTS.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/AGENTS.md) and [`CONTRIBUTING.md`](file:///d:/REAL_projects/Domain-Vihaan%20X/CONTRIBUTING.md):

1. **Single Source of Truth for Network Communication:**  
   The schemas and OpenAPI definitions located in this directory define the exact JSON payload shapes and HTTP endpoints that Developer A's backend must emit and Developer B's frontend must consume.
2. **Mutual Agreement Before Change:**  
   Neither developer may modify existing fields, endpoint paths, or error structures unilaterally. Any proposed change to `contracts/` requires:
   - Formally updating the relevant section in `docs/02-architecture/API_CONTRACT.md`.
   - Explicit mutual review and acceptance by both Developer A and Developer B.
3. **Mocking & Parallel Development:**  
   Developer B uses `contracts/examples/` and JSON schemas to build and test frontend components independently of backend uptime. Developer A builds integration tests that assert responses against these exact JSON schemas.

---

## 2. Directory Layout

```
contracts/
├── README.md                           # This governance guide
├── openapi/
│   └── openapi.yaml                    # Canonical OpenAPI 3.1 REST API specification
├── schemas/
│   ├── asset.schema.json               # JSON Schema for digital asset entities
│   ├── finding.schema.json             # JSON Schema for normalized security findings
│   ├── relationship.schema.json        # JSON Schema for graph edges
│   ├── attack-path.schema.json         # JSON Schema for attack paths and steps
│   └── remediation.schema.json         # JSON Schema for remediation proposals
└── examples/
    ├── assets.json                     # Canonical asset payload samples
    ├── findings.json                   # Canonical finding payload samples
    └── attack-paths.json               # Canonical attack-path payload samples
```
