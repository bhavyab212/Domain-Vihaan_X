# REST API Contract Specification — Domain-Vihaan_X

> **Document ID:** API-001  
> **Project Name:** Domain-Vihaan_X  
> **Domain:** Cybersecurity (VIHAAN X Hackathon)  
> **Document Status:** PROPOSED (Updated for Judging-First & Dual-Mode Strategy)  
> **Author:** Principal Software Architect & API Engineer  
> **Last Updated:** 2026-11-15T00:26:00+05:30  
> **Base URL:** `http://127.0.0.1:8000/api`  
> **Protocol:** HTTP/1.1 (JSON UTF-8)  
> **OpenAPI Version:** 3.1.0  
> **Core Strategic Philosophy:** **Frontend-first. Backend-reliable. Demo-driven.**  

---

## 1. Global Conventions & Standard Response Envelopes

Every API endpoint strictly conforms to standard REST semantics and returns JSON payloads wrapped in an envelope containing explicit operating mode and provenance metadata.

### 1.1 Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "timestamp": "2026-11-15T00:26:00Z",
    "request_id": "req_01h8x4a",
    "mode": "DEMO_MODE",
    "degraded_fallback_engaged": false
  }
}
```

### 1.2 Error Envelope
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "TARGET_UNAUTHORIZED",
    "message": "The specified target locator is not in the authorized scanning allowlist.",
    "details": {
      "locator": "http://unauthorized-external-site.com",
      "allowed_prefixes": ["/mock_env/", "test_env/mock_saas", "acmecloud.internal"]
    }
  },
  "meta": {
    "timestamp": "2026-11-15T00:26:00Z",
    "request_id": "req_01h8x4b",
    "mode": "LIVE_ASSESSMENT_MODE",
    "degraded_fallback_engaged": false
  }
}
```

---

## 2. Authentication & Authorization Headers

For local development and the VIHAAN X live demo, endpoints authenticate via static API tokens or default to the administrative operator context:
- Header: `X-API-Key: vihaan-x-local-dev-key-2026`
- Header: `X-User-ID: usr_01h8x2`

---

## 3. Endpoints Specification

### 3.1 System Health & Scanner Availability
```http
GET /api/health
```
- **Description:** Verifies Control Plane health, SQLite WAL mode, and detects availability of local CLI binaries and execution adapters.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "status": "HEALTHY",
      "version": "0.1.0-mvp",
      "database": "CONNECTED",
      "current_mode": "DEMO_MODE",
      "scanners_detected": {
        "gitleaks": true,
        "checkov": true,
        "trivy": true,
        "subfinder": true,
        "hexstrike_adapter": "OFFLINE_FALLBACK_AVAILABLE"
      },
      "offline_rule_engine": "READY"
    },
    "error": null,
    "meta": {
      "timestamp": "2026-11-15T00:26:00Z",
      "request_id": "req_001",
      "mode": "DEMO_MODE",
      "degraded_fallback_engaged": false
    }
  }
  ```

---

### 3.2 Demo Scenario Management (One-Click Reset)

#### `POST /api/v1/demo/reset`
- **Description:** Resets the synthetic demo scenario to a clean initial state. Re-seeds the SQLite database with baseline synthetic SaaS assets, findings (provenance `SIMULATED_DEMO`), relationships, and attack paths. Restores working runtime fixtures at `data/runtime/demo_workspace/mock_saas/` from the immutable baseline `data/demo/mock_saas/`.
- **Response `200 OK` (`DemoResetResponse`):**
  ```json
  {
    "status": "RESET_SUCCESSFUL",
    "scenarioId": "demo-scenario-saas-breach",
    "mode": "DEMO_MODE",
    "message": "Demo scenario reset to canonical synthetic baseline.",
    "assetsCount": 3,
    "findingsCount": 2,
    "relationshipsCount": 2,
    "attackPathsCount": 1,
    "runtimeWorkspace": "d:/REAL_projects/Domain-Vihaan X/data/runtime/demo_workspace/mock_saas",
    "durationMs": 22.6,
    "walVerified": true,
    "resetAt": "2026-11-15T02:35:00.000Z"
  }
  ```

---

### 3.3 Asset Inventory Management

#### `GET /api/assets`
- **Description:** Returns all registered digital assets.
- **Query Parameters:**
  - `mode` (optional): `DEMO` or `LIVE`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "ast_repo_01",
        "name": "acme-backend-api",
        "asset_type": "REPOSITORY",
        "environment": "PRODUCTION",
        "criticality": "HIGH",
        "locator": "test_env/mock_saas/repo",
        "provenance": "SIMULATED_DEMO",
        "is_authorized": true,
        "created_at": "2026-11-15T00:00:00Z"
      },
      {
        "id": "ast_iam_01",
        "name": "StagingDeployerRole",
        "asset_type": "IAM_ROLE",
        "environment": "STAGING",
        "criticality": "MEDIUM",
        "locator": "arn:aws:iam::123456789012:role/StagingDeployer",
        "provenance": "SIMULATED_DEMO",
        "is_authorized": true,
        "created_at": "2026-11-15T00:00:00Z"
      },
      {
        "id": "ast_s3_01",
        "name": "acme-prod-db-backups",
        "asset_type": "CLOUD_STORAGE",
        "environment": "PRODUCTION",
        "criticality": "CRITICAL",
        "locator": "s3://acme-prod-db-backups",
        "provenance": "SIMULATED_DEMO",
        "is_authorized": true,
        "created_at": "2026-11-15T00:00:00Z"
      }
    ],
    "error": null
  }
  ```

---

### 3.4 Assessment Orchestration

#### `POST /api/assessments`
- **Description:** Triggers a security assessment in either `DEMO_MODE` or `LIVE_ASSESSMENT_MODE`.
- **Request Body:**
  ```json
  {
    "name": "AcmeCloud Full Security Assessment",
    "mode": "DEMO",
    "asset_ids": ["ast_repo_01", "ast_iam_01", "ast_s3_01"]
  }
  ```
- **Response `202 Accepted`:**
  ```json
  {
    "success": true,
    "data": {
      "assessment_id": "asm_demo_01",
      "status": "RUNNING",
      "mode": "DEMO_MODE",
      "assets_queued": 3,
      "estimated_duration_seconds": 3
    },
    "error": null
  }
  ```

#### `GET /api/assessments/{id}`
- **Description:** Real-time assessment status, progress percentage, and summary metrics.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "asm_demo_01",
      "name": "AcmeCloud Full Security Assessment",
      "status": "COMPLETED",
      "mode": "DEMO_MODE",
      "total_findings_count": 2,
      "critical_findings_count": 1,
      "attack_paths_count": 1,
      "started_at": "2026-11-15T00:20:00Z",
      "completed_at": "2026-11-15T00:20:03Z",
      "partial_results": false
    },
    "error": null
  }
  ```

---

### 3.5 Threats and Findings Center

#### `GET /api/findings`
- **Description:** Returns normalized findings with full evidence provenance.
- **Query Parameters:**
  - `assessment_id` (optional): Filter by assessment run.
  - `severity` (optional): `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "fnd_sec_01",
        "title": "Hardcoded AWS Access Secret Key",
        "severity": "CRITICAL",
        "category": "SECRET",
        "asset_id": "ast_repo_01",
        "provenance": "SIMULATED_DEMO",
        "cvss_score": 8.5,
        "contextual_risk_score": 9.4,
        "rule_id": "aws-secret-key",
        "file_path": "config/staging.env",
        "line_number": 3,
        "status": "OPEN",
        "evidence_redacted": "AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
      },
      {
        "id": "fnd_iac_01",
        "title": "Wildcard Action Permitted in S3 IAM Policy",
        "severity": "HIGH",
        "category": "IAC",
        "asset_id": "ast_iam_01",
        "provenance": "SIMULATED_DEMO",
        "cvss_score": 6.5,
        "contextual_risk_score": 8.7,
        "rule_id": "CKV_AWS_62",
        "file_path": "iam_staging.tf",
        "line_number": 7,
        "status": "OPEN",
        "evidence_redacted": "Resource = \"*\""
      }
    ],
    "error": null
  }
  ```

---

### 3.6 Business Security Graph

#### `GET /api/graph/{assessment_id}`
- **Description:** Returns the React Flow-formatted graph data with custom node configurations and animated attack edges.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "nodes": [
        {
          "id": "ast_repo_01",
          "type": "assetNode",
          "position": { "x": 100, "y": 150 },
          "data": {
            "name": "acme-backend-api",
            "asset_type": "REPOSITORY",
            "environment": "PRODUCTION",
            "criticality": "HIGH",
            "provenance": "SIMULATED_DEMO"
          }
        },
        {
          "id": "fnd_sec_01",
          "type": "findingNode",
          "position": { "x": 100, "y": 300 },
          "data": {
            "title": "Hardcoded AWS Access Key",
            "severity": "CRITICAL",
            "risk_score": 9.4,
            "provenance": "SIMULATED_DEMO"
          }
        },
        {
          "id": "ast_iam_01",
          "type": "assetNode",
          "position": { "x": 400, "y": 150 },
          "data": {
            "name": "StagingDeployerRole",
            "asset_type": "IAM_ROLE",
            "environment": "STAGING",
            "criticality": "MEDIUM",
            "provenance": "SIMULATED_DEMO"
          }
        },
        {
          "id": "ast_s3_01",
          "type": "assetNode",
          "position": { "x": 700, "y": 150 },
          "data": {
            "name": "acme-prod-db-backups",
            "asset_type": "CLOUD_STORAGE",
            "environment": "PRODUCTION",
            "criticality": "CRITICAL",
            "provenance": "SIMULATED_DEMO"
          }
        }
      ],
      "edges": [
        {
          "id": "e_fnd_repo",
          "source": "fnd_sec_01",
          "target": "ast_repo_01",
          "label": "FOUND_IN",
          "animated": false
        },
        {
          "id": "e_repo_iam",
          "source": "ast_repo_01",
          "target": "ast_iam_01",
          "label": "AUTHENTICATES_VIA",
          "animated": true,
          "style": { "stroke": "#ef4444", "strokeWidth": 3 }
        },
        {
          "id": "e_iam_s3",
          "source": "ast_iam_01",
          "target": "ast_s3_01",
          "label": "PERMISSIVE_ACCESS",
          "animated": true,
          "style": { "stroke": "#ef4444", "strokeWidth": 3 }
        }
      ]
    },
    "error": null
  }
  ```

---

### 3.7 Attack Path Investigation & AI Analysis

#### `GET /api/attack-paths`
- **Description:** Returns detected attack paths with choke point analysis.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "atp_demo_01",
        "title": "Repo Credential Leak to Production Database Backup Exfiltration",
        "ingress_asset_id": "ast_repo_01",
        "target_asset_id": "ast_s3_01",
        "composite_risk_score": 9.4,
        "hop_count": 3,
        "choke_point_asset_id": "ast_iam_01",
        "status": "ACTIVE",
        "provenance": "SIMULATED_DEMO",
        "node_ids": ["ast_repo_01", "fnd_sec_01", "ast_iam_01", "fnd_iac_01", "ast_s3_01"]
      }
    ],
    "error": null
  }
  ```

#### `POST /api/ai/analyze/{attack_path_id}`
- **Description:** Synthesizes structured natural language explanation using grounded prompt contracts, automatically falling back to the embedded deterministic rule engine if the external LLM is offline or times out (> 5s).
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "attack_path_id": "atp_demo_01",
      "summary": "A committed AWS secret in repository 'acme-backend-api' enables an attacker to assume IAM Role 'StagingDeployer'. Wildcard permissions allow this role to pivot across boundaries to exfiltrate database backups from 's3://acme-prod-db-backups'.",
      "technical_kill_chain": "1. Ingress: Credential leaked in git commit.\n2. Lateral Movement: StagingDeployer has wildcard S3 permissions.\n3. Impact: Exfiltration of customer backup archives.",
      "choke_point": "IAM Role StagingDeployer (ast_iam_01)",
      "confidence": 0.98,
      "engine_used": "DETERMINISTIC_RULE_FALLBACK",
      "offline_mode": true
    },
    "error": null,
    "meta": { "degraded_fallback_engaged": true }
  }
  ```

---

### 3.8 AI Remediation Center Studio

#### `GET /api/remediations/{id}`
- **Description:** Returns remediation recommendation, target file locator, and unified code diff.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "rem_demo_01",
      "finding_id": "fnd_iac_01",
      "attack_path_id": "atp_demo_01",
      "title": "Scope Staging IAM Policy to Explicit Staging Bucket",
      "status": "PENDING_APPROVAL",
      "action": {
        "id": "act_demo_01",
        "action_type": "APPLY_IAC_DIFF",
        "target_file": "test_env/mock_saas/iac/iam_staging.tf",
        "unified_diff": "--- a/iam_staging.tf\n+++ b/iam_staging.tf\n@@ -6,3 +6,3 @@\n-        Resource = \"*\"\n+        Resource = \"arn:aws:s3:::acme-staging-assets/*\""
      }
    },
    "error": null
  }
  ```

#### `POST /api/remediations/{id}/approve`
- **Description:** Records human consent to execute remediation.
- **Request Body:**
  ```json
  {
    "decision": "APPROVED",
    "rationale": "Verified staging policy restricts access without breaking builds."
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "remediation_id": "rem_demo_01",
      "status": "APPROVED",
      "approved_by": "usr_01h8x2",
      "approved_at": "2026-11-15T00:26:30Z"
    },
    "error": null
  }
  ```

#### `POST /api/remediations/{id}/execute`
- **Description:** Executes approved remediation patch on test environment and triggers automated verification re-scan.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "remediation_id": "rem_demo_01",
      "status": "VERIFIED_RESOLVED",
      "attack_path_status": "SEVERED",
      "reassessment": {
        "reassessment_id": "asm_rescan_01",
        "finding_cleared": true,
        "attack_edge_severed": true,
        "reassessment_duration_ms": 1800
      }
    },
    "error": null
  }
  ```
