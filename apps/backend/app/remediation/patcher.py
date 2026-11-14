# apps/backend/app/remediation/patcher.py
"""
Generates concrete remediation actions (code diffs, terraform patches, script commands).
Strictly governed by AGENTS.md Section 3: never applies changes without human approval.
"""

from typing import Dict, Any, Optional
from app.schemas.remediation import RemediationResponse


class RemediationPatcher:
    @staticmethod
    def generate_secret_remediation(finding_id: str, file_path: str) -> RemediationResponse:
        return RemediationResponse(
            id=f"rem-{finding_id}",
            findingId=finding_id,
            title="Revoke Exposed Secret and Parameterize",
            description=f"Remove hardcoded credential in {file_path} and replace with environment variable reference.",
            patchDiff=f"--- a/{file_path}\n+++ b/{file_path}\n@@ -1,1 +1,1 @@\n-SECRET_KEY=***\n+SECRET_KEY=${{SECRET_VAULT_KEY}}",
            requiresApproval=True,
            status="PENDING",
            verificationStatus="UNVERIFIED",
            createdAt="2026-11-15T00:00:00Z"
        )
