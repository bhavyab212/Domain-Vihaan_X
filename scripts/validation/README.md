# Validation Scripts (`scripts/validation/`)

Contains scripts to validate OpenAPI contracts, lint codebases, and run security scans.

- `validate-contracts.sh` / `validate-contracts.ps1`: Asserts that JSON schemas and OpenAPI 3.1 definitions are syntactically valid and in sync.
- `lint-all.sh` / `lint-all.ps1`: Runs Ruff on backend and ESLint on frontend.
