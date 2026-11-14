# apps/backend/tests/test_remediation_endpoints.py
"""
Integration tests for Remediation REST API Endpoints:
GET /remediations, GET /remediations/{id},
POST /remediations/{id}/approve, POST /remediations/{id}/reject,
POST /remediations/{id}/verify.
"""

import pytest


def test_remediation_lifecycle_api_end_to_end(client):
    """
    Tests the complete remediation lifecycle via REST API:
    Reset -> List Remediations -> Approve -> Verify -> Mitigate Attack Path.
    """
    # Step 1: Reset demo environment
    reset_res = client.post("/api/v1/demo/reset")
    assert reset_res.status_code == 200

    # Step 2: List remediations
    list_res = client.get("/api/v1/remediations")
    assert list_res.status_code == 200
    remediations = list_res.json()
    assert len(remediations) >= 1

    target_rem = remediations[0]
    rem_id = target_rem["id"]
    assert target_rem["status"] == "PENDING"
    assert target_rem["verificationStatus"] == "UNVERIFIED"
    assert "patchDiff" in target_rem
    assert target_rem["patchDiff"] is not None

    # Step 3: Get single remediation details
    get_res = client.get(f"/api/v1/remediations/{rem_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == rem_id

    # Step 4: Approval gate enforcement: empty approvedBy must fail with 403
    forbidden_res = client.post(
        f"/api/v1/remediations/{rem_id}/approve",
        json={"approvedBy": "", "comments": "automated test"}
    )
    assert forbidden_res.status_code == 403

    # Step 5: Valid approval: apply patch
    approve_res = client.post(
        f"/api/v1/remediations/{rem_id}/approve",
        json={"approvedBy": "priya.sharma@saas-startup.io", "comments": "Approved staging IAM hardening"}
    )
    assert approve_res.status_code == 200
    applied_data = approve_res.json()
    assert applied_data["status"] == "APPLIED"

    # Step 6: Verify remediation
    verify_res = client.post(f"/api/v1/remediations/{rem_id}/verify")
    assert verify_res.status_code == 200
    verified_data = verify_res.json()
    assert verified_data["verificationStatus"] == "PASSED"

    # Step 7: Check that attack path was mitigated
    paths_res = client.get("/api/v1/attack-paths")
    assert paths_res.status_code == 200
    paths = paths_res.json()
    target_path = next((p for p in paths if p["id"] == "path-01"), None)
    if target_path:
        assert target_path["status"] == "MITIGATED"


def test_remediation_rejection_api(client):
    """Verify rejection endpoint sets status to REJECTED."""
    client.post("/api/v1/demo/reset")
    list_res = client.get("/api/v1/remediations")
    remediations = list_res.json()
    assert len(remediations) >= 1
    rem_id = remediations[0]["id"]

    reject_res = client.post(
        f"/api/v1/remediations/{rem_id}/reject",
        json={"rejectedBy": "security-architect@company.local", "reason": "Further architectural review needed"}
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "REJECTED"


def test_nonexistent_remediation_404(client):
    """Verify non-existent remediation ID returns HTTP 404."""
    res = client.get("/api/v1/remediations/rem-nonexistent-999")
    assert res.status_code == 404
