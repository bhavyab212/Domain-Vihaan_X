# apps/backend/app/remediation/generator.py
"""
Remediation Recommendation Generator (TSK-018).
Generates structured remediation proposals, unified diffs, and rollback plans
for identified findings and attack-path choke points.
"""

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.models.entities import RemediationModel, FindingModel, AttackPathModel
from app.schemas.remediation import RemediationResponse
from app.remediation.differ import UnifiedDiffEngine


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class RemediationGenerator:
    """
    Generates structured remediation proposals and persists them in the database.
    """

    def __init__(self, db: Session):
        self.db = db

    def generate_proposal_for_finding(
        self,
        finding_id: str,
        attack_path_id: Optional[str],
        title: str,
        description: str,
        target_file: str,
        original_content: str,
        patched_content: str,
        shell_script: Optional[str] = None
    ) -> RemediationResponse:
        """
        Creates a proposed remediation with before/after unified diffs.
        """
        rem_id = f"rem-{uuid.uuid4().hex[:8]}"
        patch_diff = UnifiedDiffEngine.generate_diff(original_content, patched_content, target_file)
        rollback_diff = UnifiedDiffEngine.generate_diff(patched_content, original_content, target_file)

        model = RemediationModel(
            id=rem_id,
            finding_id=finding_id,
            attack_path_id=attack_path_id,
            title=title,
            description=description,
            target_file=target_file,
            patch_diff=patch_diff,
            rollback_diff=rollback_diff,
            shell_script=shell_script,
            requires_approval=True,
            status="PENDING",
            verification_status="UNVERIFIED",
            is_demo=True,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)

        return RemediationResponse(
            id=model.id,
            findingId=model.finding_id,
            attackPathId=model.attack_path_id,
            title=model.title,
            description=model.description,
            patchDiff=model.patch_diff,
            shellScript=model.shell_script,
            requiresApproval=model.requires_approval,
            status=model.status,
            verificationStatus=model.verification_status,
            createdAt=model.created_at.isoformat() + "Z" if model.created_at else _utc_now_iso(),
        )
