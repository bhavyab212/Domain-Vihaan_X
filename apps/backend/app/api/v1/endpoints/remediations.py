# apps/backend/app/api/v1/endpoints/remediations.py
"""
Human-in-the-Loop Remediation REST endpoints (TSK-018, TSK-019, TSK-020).
Enforces human approval gates, atomic patch application, and automated verification loops.
"""

from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.entities import RemediationModel, FindingModel, AttackPathModel
from app.schemas.remediation import (
    RemediationResponse,
    RemediationApproveRequest,
    RemediationRejectRequest
)
from app.remediation.generator import RemediationGenerator
from app.remediation.executor import RemediationExecutor
from app.remediation.verifier import RemediationVerifier
from app.remediation.differ import UnifiedDiffEngine
from app.core.exceptions import DomainVihaanXException, ResourceNotFoundError
from app.core.safety import SecurityBoundaryError

router = APIRouter()


def _ensure_demo_remediations(db: Session) -> None:
    """Auto-seeds canonical demo remediation proposals if none exist in the database."""
    count = db.query(RemediationModel).count()
    if count > 0:
        return

    # Check for FIND-IAC-001 (or any finding) to attach to
    iac_finding = db.query(FindingModel).filter(
        (FindingModel.id == "FIND-IAC-001") | (FindingModel.scanner == "checkov")
    ).first()

    if not iac_finding:
        return

    current = Path(__file__).resolve()
    project_root = current.parents[4]
    workspace = (project_root / "data" / "runtime" / "demo_workspace" / "mock_saas")
    if not workspace.exists():
        workspace = (project_root / "data" / "demo" / "mock_saas")

    tf_file = workspace / "iac" / "iam_staging.tf"
    if tf_file.exists():
        orig_tf = tf_file.read_text(encoding="utf-8")
    else:
        orig_tf = """# Misconfigured overprivileged role granting full S3 wildcard admin
resource "aws_iam_role_policy" "wildcard_s3_access" {
  name = "staging_wildcard_s3_policy"
  role = aws_iam_role.staging_deployer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "s3:*"
        Resource = "*"
      }
    ]
  })
}
"""
    patched_tf = orig_tf.replace(
        'Action   = "s3:*"',
        'Action   = [\n          "s3:GetObject",\n          "s3:ListBucket"\n        ]'
    ).replace(
        'Resource = "*"',
        'Resource = [\n          "arn:aws:s3:::staging-assets-bucket",\n          "arn:aws:s3:::staging-assets-bucket/*"\n        ]'
    )
    generator = RemediationGenerator(db=db)
    generator.generate_proposal_for_finding(
        finding_id=iac_finding.id,
        attack_path_id="path-01",
        title="Restrict S3 Wildcard Admin Access on Staging Deployer Role",
        description="Scope S3 permissions from wildcard 's3:*' down to 's3:GetObject' and 's3:ListBucket' on staging-assets-bucket.",
        target_file="iac/iam_staging.tf",
        original_content=orig_tf,
        patched_content=patched_tf
    )


@router.get("", response_model=List[RemediationResponse], summary="List proposed remediations")
async def list_remediations(
    finding_id: Optional[str] = Query(None, description="Filter by finding identifier"),
    attack_path_id: Optional[str] = Query(None, description="Filter by attack path identifier"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by lifecycle status"),
    db: Session = Depends(get_db)
):
    """
    Returns proposed, approved, and applied remediation actions.
    Auto-seeds canonical demo proposals when operating in clean demo state.
    """
    _ensure_demo_remediations(db)

    query = db.query(RemediationModel)
    if finding_id:
        query = query.filter(RemediationModel.finding_id == finding_id)
    if attack_path_id:
        query = query.filter(RemediationModel.attack_path_id == attack_path_id)
    if status_filter:
        query = query.filter(RemediationModel.status == status_filter.upper())

    records = query.order_by(RemediationModel.created_at.asc()).all()
    executor = RemediationExecutor(db=db)
    return [executor._to_schema(r) for r in records]


@router.get("/{remediation_id}", response_model=RemediationResponse, summary="Get remediation details")
async def get_remediation(remediation_id: str, db: Session = Depends(get_db)):
    """Retrieves full remediation details including unified patch diff and verification state."""
    _ensure_demo_remediations(db)
    record = db.query(RemediationModel).filter(RemediationModel.id == remediation_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Remediation '{remediation_id}' not found.")

    executor = RemediationExecutor(db=db)
    return executor._to_schema(record)


@router.post("/{remediation_id}/approve", response_model=RemediationResponse, summary="Approve and apply remediation")
async def approve_remediation(
    remediation_id: str,
    payload: RemediationApproveRequest,
    db: Session = Depends(get_db)
):
    """
    Explicit human approval gate required before remediation is executed.
    Strictly governed by AGENTS.md Section 3 and ADR-007.
    """
    _ensure_demo_remediations(db)
    executor = RemediationExecutor(db=db)
    try:
        return executor.approve_and_apply(remediation_id, payload)
    except SecurityBoundaryError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DomainVihaanXException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{remediation_id}/apply", response_model=RemediationResponse, summary="Apply approved remediation")
async def apply_remediation(
    remediation_id: str,
    payload: RemediationApproveRequest,
    db: Session = Depends(get_db)
):
    """Alias for approve endpoint to support flexible client workflows."""
    return await approve_remediation(remediation_id, payload, db)


@router.post("/{remediation_id}/reject", response_model=RemediationResponse, summary="Reject remediation proposal")
async def reject_remediation(
    remediation_id: str,
    payload: Optional[RemediationRejectRequest] = None,
    db: Session = Depends(get_db)
):
    """Rejects a proposed remediation, preventing execution."""
    _ensure_demo_remediations(db)
    executor = RemediationExecutor(db=db)
    rejected_by = payload.rejectedBy if payload else "security-lead@company.local"
    reason = payload.reason if payload else "Rejected by operator"
    try:
        return executor.reject(remediation_id, rejected_by, reason)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DomainVihaanXException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{remediation_id}/verify", response_model=RemediationResponse, summary="Trigger verification reassessment")
async def verify_remediation_loop(remediation_id: str, db: Session = Depends(get_db)):
    """
    Triggers automated verification loop (TSK-020).
    Re-assesses patched assets, resolves findings, and severs the attack path.
    """
    _ensure_demo_remediations(db)
    verifier = RemediationVerifier(db=db)
    try:
        return verifier.verify_remediation(remediation_id)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DomainVihaanXException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
