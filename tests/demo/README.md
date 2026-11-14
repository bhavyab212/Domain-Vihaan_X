# Automated Demo Verification (`tests/demo/`)

Validates that:
1. `POST /api/v1/demo/reset` succeeds within 100 milliseconds.
2. The canonical synthetic demo scenario in `data/demo/scenario.json` produces the expected multi-hop attack path.
3. The demo functions completely offline without any internet connection or external LLM API key.
4. Remediation severing can be executed and verified deterministically.
