# Demo Scripts (`scripts/demo/`)

Contains scripts to reset, seed, and dry-run the 12-step hackathon demo presentation.

- `reset-demo.sh` / `reset-demo.ps1`: Triggers `POST /api/v1/demo/reset` to restore synthetic baseline.
- `seed-demo.sh` / `seed-demo.ps1`: Pre-populates the local SQLite database from `data/demo/scenario.json`.
