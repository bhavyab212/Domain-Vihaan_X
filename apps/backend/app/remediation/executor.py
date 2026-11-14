# apps/backend/app/remediation/executor.py
"""
Remediation Approval and Execution Gate (TSK-019).
Enforces strict human-in-the-loop authorization, path confinement,
atomic file modification, backup preservation, and idempotent execution.
"""

import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from sqlalchemy.orm import Session

from app.models.entities import RemediationModel
from app.schemas.remediation import RemediationResponse, RemediationApproveRequest
from app.remediation.differ import UnifiedDiffEngine
from app.core.exceptions import DomainVihaanXException, ResourceNotFoundError
from app.core.safety import validate_target_path, SecurityBoundaryError


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class RemediationExecutor:
    """
    Enforces human approval gates and performs atomic, isolated remediation patch execution.
    """

    def __init__(self, db: Session, workspace_root: Optional[Path] = None):
        self.db = db
        if workspace_root:
            self.workspace_root = workspace_root.resolve()
        else:
            # Default to active runtime demo workspace
            current = Path(__file__).resolve()
            project_root = current.parents[4]
            self.workspace_root = (project_root / "data" / "runtime" / "demo_workspace" / "mock_saas").resolve()

    def approve_and_apply(
        self,
        remediation_id: str,
        request: RemediationApproveRequest
    ) -> RemediationResponse:
        """
        Executes an approved remediation patch after validating human operator approval.
        """
        # Step 1: Strict Human Approval Gate (AGENTS.md Section 3 Rule 5)
        if not request.approvedBy or not request.approvedBy.strip():
            raise SecurityBoundaryError(
                "Security Boundary Enforcement: Remediation execution strictly requires explicit human approval."
            )

        # Step 2: Fetch remediation record
        model = self.db.query(RemediationModel).filter(RemediationModel.id == remediation_id).first()
        if not model:
            raise ResourceNotFoundError(f"Remediation '{remediation_id}' not found.")

        # Step 3: Lifecycle state validation & Idempotency
        if model.status == "APPLIED":
            # Idempotent response
            return self._to_schema(model)

        if model.status not in ["PENDING", "APPROVED"]:
            raise DomainVihaanXException(
                f"Cannot apply remediation with status '{model.status}'. Allowed: PENDING, APPROVED."
            )

        # Step 4: Validate target file path and confinement
        if not model.target_file or not model.patch_diff:
            raise DomainVihaanXException("Remediation record lacks target file or patch diff.")

        target_path = (self.workspace_root / model.target_file).resolve()
        validate_target_path(target_path, extra_allowed_roots=[self.workspace_root])

        if not target_path.exists():
            raise ResourceNotFoundError(f"Target file for remediation does not exist: {target_path}")

        # Step 5: Atomic execution with backup
        backup_path = target_path.with_suffix(target_path.suffix + ".bak")
        try:
            current_content = target_path.read_text(encoding="utf-8")
            shutil.copy2(target_path, backup_path)

            patched_content = UnifiedDiffEngine.apply_diff(current_content, model.patch_diff)
            target_path.write_text(patched_content, encoding="utf-8")

            # Update state in database
            now = _utc_now()
            model.status = "APPLIED"
            model.approved_by = request.approvedBy.strip()
            model.approved_at = now
            model.approval_comments = request.comments
            model.applied_at = now

            self.db.commit()
            self.db.refresh(model)
            return self._to_schema(model)

        except Exception as e:
            # Automatic rollback on failure
            if backup_path.exists():
                shutil.copy2(backup_path, target_path)
            model.status = "FAILED"
            self.db.commit()
            raise DomainVihaanXException(f"Remediation execution failed: {e}") from e

    def reject(
        self,
        remediation_id: str,
        rejected_by: str,
        reason: Optional[str] = None
    ) -> RemediationResponse:
        """
        Rejects a proposed remediation, preventing any future execution.
        """
        model = self.db.query(RemediationModel).filter(RemediationModel.id == remediation_id).first()
        if not model:
            raise ResourceNotFoundError(f"Remediation '{remediation_id}' not found.")

        if model.status == "APPLIED":
            raise DomainVihaanXException("Cannot reject an already applied remediation.")

        model.status = "REJECTED"
        model.approval_comments = f"Rejected by {rejected_by}: {reason or 'No reason provided'}"
        self.db.commit()
        self.db.refresh(model)
        return self._to_schema(model)

    def _to_schema(self, model: RemediationModel) -> RemediationResponse:
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
