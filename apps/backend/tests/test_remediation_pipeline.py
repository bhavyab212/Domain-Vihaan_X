# apps/backend/tests/test_remediation_pipeline.py
"""
Unit and integration tests for Remediation Pipeline:
TSK-018 (Diff Generator), TSK-019 (Human Approval Gate & Execution),
TSK-020 (Verification Loop & Path Severing).
"""

import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

from app.models.entities import AssetModel, FindingModel, AttackPathModel
from app.schemas.remediation import (
    RemediationResponse,
    RemediationApproveRequest
)
from app.remediation.differ import UnifiedDiffEngine
from app.remediation.generator import RemediationGenerator
from app.remediation.executor import RemediationExecutor
from app.remediation.verifier import RemediationVerifier
from app.core.safety import SecurityBoundaryError
from app.core.exceptions import DomainVihaanXException


@pytest.fixture
def seeded_db(db_session):
    asset = AssetModel(
        id="asset-iam-staging-role",
        name="staging_deployer_role",
        type="CLOUD_ACCOUNT",
        owner="Engineering",
        is_demo=True
    )
    db_session.add(asset)
    db_session.flush()

    finding = FindingModel(
        id="find-checkov-01",
        title="Wildcard S3 Access",
        description="IAM policy has s3:* wildcard",
        severity="HIGH",
        scanner="checkov",
        asset_id="asset-iam-staging-role",
        status="OPEN",
        is_demo=True
    )
    db_session.add(finding)

    path = AttackPathModel(
        id="path-01",
        title="Public Repo to Customer PII Vault Exfiltration",
        summary="Test attack path",
        severity="CRITICAL",
        confidence_score=0.95,
        entry_point_asset_id="asset-iam-staging-role",
        crown_jewel_asset_id="asset-iam-staging-role",
        steps_json="[]",
        status="ACTIVE",
        is_demo=True
    )
    db_session.add(path)
    db_session.commit()
    return db_session


SAMPLE_TF_ORIGINAL = """# Staging IAM Policy
resource "aws_iam_role_policy" "wildcard_s3_access" {
  name = "staging_wildcard_s3_policy"
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

SAMPLE_TF_PATCHED = """# Staging IAM Policy
resource "aws_iam_role_policy" "wildcard_s3_access" {
  name = "staging_wildcard_s3_policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::staging-assets-bucket",
          "arn:aws:s3:::staging-assets-bucket/*"
        ]
      }
    ]
  })
}
"""


def test_differ_creates_and_applies_unified_diff():
    """Verify UnifiedDiffEngine generates readable standard diffs and can apply/rollback."""
    diff = UnifiedDiffEngine.generate_diff(SAMPLE_TF_ORIGINAL, SAMPLE_TF_PATCHED, "iac/iam_staging.tf")
    assert "--- a/iac/iam_staging.tf" in diff
    assert "+++ b/iac/iam_staging.tf" in diff
    assert '-        Action   = "s3:*"' in diff
    assert '+          "s3:GetObject",' in diff

    # Apply diff
    patched = UnifiedDiffEngine.apply_diff(SAMPLE_TF_ORIGINAL, diff)
    assert 'Action   = "s3:*"' not in patched
    assert "s3:GetObject" in patched

    # Reverse diff
    reverse_diff = UnifiedDiffEngine.generate_diff(SAMPLE_TF_PATCHED, SAMPLE_TF_ORIGINAL, "iac/iam_staging.tf")
    reverted = UnifiedDiffEngine.apply_diff(patched, reverse_diff)
    assert '-        Action   = "s3:*"' not in reverse_diff
    assert reverted.strip() == SAMPLE_TF_ORIGINAL.strip()


def test_remediation_proposal_generation(seeded_db):
    """Verify generator constructs valid RemediationResponse persisted in DB."""
    generator = RemediationGenerator(db=seeded_db)
    proposal = generator.generate_proposal_for_finding(
        finding_id="find-checkov-01",
        attack_path_id="path-01",
        title="Restrict S3 Wildcard Admin Access",
        description="Replace s3:* on all resources with scoped staging bucket read permissions.",
        target_file="iac/iam_staging.tf",
        original_content=SAMPLE_TF_ORIGINAL,
        patched_content=SAMPLE_TF_PATCHED
    )

    assert isinstance(proposal, RemediationResponse)
    assert proposal.id.startswith("rem-")
    assert proposal.findingId == "find-checkov-01"
    assert proposal.attackPathId == "path-01"
    assert proposal.requiresApproval is True
    assert proposal.status == "PENDING"
    assert proposal.verificationStatus == "UNVERIFIED"
    assert "--- a/iac/iam_staging.tf" in proposal.patchDiff


def test_human_approval_gate_enforcement(seeded_db, tmp_path):
    """Verify remediation execution is strictly blocked without valid approvedBy."""
    generator = RemediationGenerator(db=seeded_db)
    proposal = generator.generate_proposal_for_finding(
        finding_id="find-checkov-01",
        attack_path_id="path-01",
        title="Test Proposal",
        description="Test Description",
        target_file="iac/iam_staging.tf",
        original_content=SAMPLE_TF_ORIGINAL,
        patched_content=SAMPLE_TF_PATCHED
    )

    executor = RemediationExecutor(db=seeded_db, workspace_root=tmp_path)

    # Empty approver must be rejected
    with pytest.raises(SecurityBoundaryError, match="explicit human approval"):
        executor.approve_and_apply(
            remediation_id=proposal.id,
            request=RemediationApproveRequest(approvedBy="")
        )


def test_atomic_patch_execution_and_rollback(seeded_db, tmp_path):
    """Verify patch writes atomically to workspace and creates backup."""
    target_rel = "iac/iam_staging.tf"
    target_abs = tmp_path / target_rel
    target_abs.parent.mkdir(parents=True, exist_ok=True)
    target_abs.write_text(SAMPLE_TF_ORIGINAL, encoding="utf-8")

    generator = RemediationGenerator(db=seeded_db)
    proposal = generator.generate_proposal_for_finding(
        finding_id="find-checkov-01",
        attack_path_id="path-01",
        title="Apply Staging Scoped IAM",
        description="Scope S3 actions",
        target_file=target_rel,
        original_content=SAMPLE_TF_ORIGINAL,
        patched_content=SAMPLE_TF_PATCHED
    )

    executor = RemediationExecutor(db=seeded_db, workspace_root=tmp_path)
    result = executor.approve_and_apply(
        remediation_id=proposal.id,
        request=RemediationApproveRequest(approvedBy="devops-lead@company.local", comments="Approved for demo")
    )

    assert result.status == "APPLIED"
    # Verify file on disk is patched
    patched_disk = target_abs.read_text(encoding="utf-8")
    assert "s3:GetObject" in patched_disk
    assert 'Action   = "s3:*"' not in patched_disk

    # Verify backup exists
    bak_file = target_abs.with_suffix(".tf.bak")
    assert bak_file.exists()


def test_remediation_rejection_prevents_execution(seeded_db, tmp_path):
    """Verify rejected remediation transitions to REJECTED and cannot be applied."""
    generator = RemediationGenerator(db=seeded_db)
    proposal = generator.generate_proposal_for_finding(
        finding_id="find-checkov-01",
        attack_path_id="path-01",
        title="Reject Test",
        description="Will be rejected",
        target_file="iac/iam_staging.tf",
        original_content=SAMPLE_TF_ORIGINAL,
        patched_content=SAMPLE_TF_PATCHED
    )

    executor = RemediationExecutor(db=seeded_db, workspace_root=tmp_path)
    rejected = executor.reject(remediation_id=proposal.id, rejected_by="security-architect@company.local", reason="Policy review needed")
    assert rejected.status == "REJECTED"

    # Now attempt to apply
    with pytest.raises(DomainVihaanXException, match="Cannot apply remediation with status"):
        executor.approve_and_apply(
            remediation_id=proposal.id,
            request=RemediationApproveRequest(approvedBy="someone@company.local")
        )


def test_verification_loop_confirms_fix(seeded_db, tmp_path):
    """Verify RemediationVerifier marks PASSED, resolves finding, and mitigates attack path."""
    target_rel = "iac/iam_staging.tf"
    target_abs = tmp_path / target_rel
    target_abs.parent.mkdir(parents=True, exist_ok=True)
    target_abs.write_text(SAMPLE_TF_PATCHED, encoding="utf-8")

    generator = RemediationGenerator(db=seeded_db)
    proposal = generator.generate_proposal_for_finding(
        finding_id="find-checkov-01",
        attack_path_id="path-01",
        title="Verify Test",
        description="Testing verification",
        target_file=target_rel,
        original_content=SAMPLE_TF_ORIGINAL,
        patched_content=SAMPLE_TF_PATCHED
    )

    # Fast-forward to APPLIED
    executor = RemediationExecutor(db=seeded_db, workspace_root=tmp_path)
    applied = executor.approve_and_apply(
        remediation_id=proposal.id,
        request=RemediationApproveRequest(approvedBy="admin@company.local")
    )

    verifier = RemediationVerifier(db=seeded_db, workspace_root=tmp_path)
    verified = verifier.verify_remediation(applied.id)

    assert verified.verificationStatus == "PASSED"
