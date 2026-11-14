# Scripted Live Demonstration Walkthrough — Domain-Vihaan_X

> **Document ID:** DEMO-001  
> **Project Name:** Domain-Vihaan_X  
> **Event:** VIHAAN X Hackathon (Cybersecurity Track)  
> **Target Audience:** Hackathon Judges & Technical Evaluators  
> **Duration:** 6 Minutes (Strict Allocation)  
> **Format:** Live Working Software Demonstration + Architecture Slides  
> **Status:** APPROVED DEMO SCRIPT (Updated for Judging-First Strategy)  
> **Last Updated:** 2026-11-15T00:40:00+05:30  
> **Core Strategic Philosophy:** **Frontend-first. Backend-reliable. Demo-driven.**  

---

## 1. Demonstration Philosophy & Guardrails

### Core Narrative Arc
Show how Domain-Vihaan_X transforms three disconnected, "low/medium" scanner alerts across **Code**, **Cloud**, and **Perimeter** into an unmistakable, business-critical **Kill Chain** using the **Business Security Graph**, and then guides safe, human-approved remediation verified by automated re-scan.

### Compliance with the 11 Demonstration Acceptance Criteria
1. **Direct Entry:** Opens directly into a functional, responsive dashboard.
2. **Coherent Information:** Displays coherent business assets and environment contexts.
3. **Assessment Initiation:** Initiates an assessment with real-time visual progress.
4. **Findings Presentation:** Presents normalized findings in the Threat Center.
5. **Attack-Path Visualization:** Reveals the signature Business Security Graph with interactive nodes.
6. **Business Risk Explanation:** Explains why the attack path matters (grounded AI or rule fallback).
7. **Remediation Recommendation:** Generates actionable code diffs for the critical choke point.
8. **Human Approval:** Obtains explicit human approval via confirmation dialog.
9. **Controlled Execution:** Applies the patch to the isolated test environment.
10. **Automated Verification:** Automatically re-scans, verifies resolution, and severs the graph edge.
11. **Graceful Resilience:** Behaves correctly and predictably if optional integrations (HexStrike, external LLM) are unavailable.

### Strict Claims That MUST NOT Be Made
1. **Never claim live production credentials were used:** Always state clearly: *"This demonstration uses an isolated, realistic synthetic SaaS environment containing safe test tokens."*
2. **Never claim an inferred attack path is an active compromise:** Always state clearly: *"The graph identifies a verified exploitable path, not an active in-progress breach."*
3. **Never claim HexStrike-AI is our core intellectual property:** Explicitly cite HexStrike as an underlying execution framework while our platform owns the graph intelligence and orchestration.

---

## 2. Preconditions and Demo Environment Setup

### Starting Environment State
- **Control Plane API:** Running on `127.0.0.1:8000`.
- **Frontend Dashboard:** Open in browser on `localhost:3000`.
- **Operating Mode:** `[DEMO MODE: SYNTHETIC SAAS]` (prominently visible in header).
- **Synthetic Fixtures:** Present in `test_env/mock_saas/`:
  - `mock_saas/repo/config/staging.env` (Synthetic token `AKIAIOSFODNN7EXAMPLE`)
  - `mock_saas/iac/iam_staging.tf` (Terraform IAM policy with `Resource = "*"`)
  - `mock_saas/storage/buckets.json` (Declares bucket `acme-prod-db-backups`)
- **One-Click Reset Verified:** `POST /api/demo/reset` verified functional before taking the stage.
- **Backup Assets:** Video recording (`presentation/demo_backup.mp4`) and offline screenshot deck open in secondary tab.

---

## 3. Minute-by-Minute 12-Stage Demo Script

```
TIMELINE (Total 6:00 Minutes):
[0:00 - 0:45] Stage 1-2: Security Command Center & Asset Inventory (Criteria 1-2)
[0:45 - 1:30] Stage 3-4: Assessment Trigger & Threat Center (Criteria 3-4)
[1:30 - 2:45] Stage 5-7: Business Security Graph & Path Traversal (Criteria 5-6)
[2:45 - 3:45] Stage 8-9: Attack Path Investigation & Remediation Diff (Criteria 6-7)
[3:45 - 4:45] Stage 10-12: Human Approval, Rescan & Edge Severing (Criteria 8-10)
[4:45 - 5:15] One-Click Reset & 2x Repeatability Proof (Repeatability Criterion)
[5:15 - 6:00] Resilience Architecture & Judge Q&A (Criterion 11)
```

---

### Stage 1: Security Command Center & Environment Entry (0:00 – 0:30)
- **Presenter (Dev B):**
  > *"Good morning, judges. Today we are demonstrating Domain-Vihaan_X using 'AcmeCloud', a realistic synthetic SaaS startup environment. Notice our Security Command Center: we open directly into an executive posture dashboard showing our digital footprint—a GitHub repository, an AWS staging IAM role, and our production database backup bucket."*
- **Interface:** **1. Security Command Center**
- **Screen Display:** Executive KPI cards (Posture Score: 8.4/10 High, 3 Registered Assets, Demo Mode active).

---

### Stage 2: Inspect Asset Topology & Provenance (0:30 – 0:45)
- **Presenter (Dev B):**
  > *"Every asset carries explicit environment tags and verified provenance. Notice the operational dependency: our repository builds our microservice, and our microservice is permitted to assume our staging IAM deployer role."*
- **Action:** Click into Asset Inventory to highlight `acme-backend-api`, `StagingDeployerRole`, and `acme-prod-db-backups`.

---

### Stage 3: Initiate Security Assessment (0:45 – 1:10)
- **Presenter (Dev A):**
  > *"Now we trigger a unified security assessment. In Live Mode, this orchestrates Gitleaks, Checkov, and Trivy. In Demo Mode, our deterministic scenario provider immediately populates verified findings in under two seconds."*
- **Action:** Click **"Run Unified Assessment"**. Progress indicator pulses smoothly and completes.

---

### Stage 4: Threat and Findings Center Triage (1:10 – 1:30)
- **Presenter (Dev A):**
  > *"The assessment returns. In conventional security dashboards, this generates disconnected rows: Gitleaks found a committed secret in staging.env; Checkov found a wildcard S3 policy in Terraform. Separately, these appear to be routine medium-severity alerts."*
- **Interface:** **3. Threat and Findings Center**
- **Screen Display:** High-density findings table with amber `[SIMULATED]` provenance badges and category tabs.

---

### Stage 5: Reveal the Signature Business Security Graph (1:30 – 2:05)
- **Presenter (Dev B):**
  > *"Now, we switch to our signature visual feature: the Business Security Graph."*
- **Interface:** **2. Business Security Graph**
- **Action:** Click **"Business Security Graph"** in navigation.
- **Screen Display:** Full-screen React Flow canvas renders assets as cards with type icons and finding badges, connected by directed operational edges.

---

### Stage 6: Algorithmic Attack-Path Identification (2:05 – 2:30)
- **Presenter (Dev B):**
  > *"Our graph engine traverses the operational topology and discovers what individual scanners missed: an active, lethal 3-hop attack path linking code to cloud storage."*
- **Action:** Click **"Active Attack Path: Credential Ingress to Database Backup"**.
- **Screen Display:** Canvas automatically centers and animates a pulsing red kill chain:
  `acme-backend-api` -> `AWS Secret Key` -> `StagingDeployerRole` -> `Wildcard Policy` -> `acme-prod-db-backups`.

---

### Stage 7: Context-Aware Risk Prioritization (2:30 – 2:45)
- **Presenter (Dev A):**
  > *"Notice the score. Raw CVSS rated this secret as 7.5. But our Contextual Risk Scorer elevated it to 9.4 Critical because it grants direct lateral reachability to our production customer backup bucket."*

---

### Stage 8: Attack Path Investigation & Grounded AI (2:45 – 3:15)
- **Presenter (Dev B):**
  > *"We click 'Investigate Path'. Our grounded AI engine explains the exact business risk in plain English, with a mandatory deterministic offline fallback if connectivity is lost."*
- **Interface:** **4. Attack Path Investigation Drawer**
- **Action:** Drawer slides out smoothly from right side.
- **Screen Display:** Structured AI narrative card:
  > *"Summary: A committed AWS secret allows an attacker to assume StagingDeployerRole. Due to wildcard S3 permissions, the attacker pivots across environments to exfiltrate database backups from 's3://acme-prod-db-backups'. Choke Point: StagingDeployerRole."*

---

### Stage 9: AI Remediation Center Studio & Diff Preview (3:15 – 3:45)
- **Presenter (Dev A):**
  > *"The platform doesn't just complain; it generates the exact fix. It identifies the IAM Role as the critical choke point and generates an IaC policy patch restricting access to staging assets only."*
- **Interface:** **5. AI Remediation Center**
- **Action:** Click **"Open Remediation Studio"**.
- **Screen Display:** Unified diff card appears:
  ```diff
  - Resource = "*"
  + Resource = "arn:aws:s3:::acme-staging-assets/*"
  ```

---

### Stage 10: Human-in-the-Loop Approval (3:45 – 4:10)
- **Presenter (Dev B):**
  > *"We enforce zero autonomous changes. A human engineer must inspect and approve."*
- **Action:** Click **"Approve & Execute Fix"**. Confirmation modal opens; Dev B confirms with audit comment.

---

### Stage 11: Controlled Execution & Automated Rescan (4:10 – 4:30)
- **Presenter (Dev A):**
  > *"The platform applies the patch to our local test environment, logs the approval to an immutable audit table, and immediately triggers an automated verification re-scan."*
- **Screen Display:** Status updates to `EXECUTING` -> `REASSESSING`.

---

### Stage 12: Verified Closure & Severed Edge (4:30 – 4:50)
- **Presenter (Dev B):**
  > *"Look at the graph: the re-scan confirms Checkov rule CKV_AWS_62 is cleared. The red pulsing line disappears, and our attack path transitions to a green checkmark: SEVERED."*
- **Screen Display:** Graph attack edge disappears; green success badge animates: **"Attack Path Severed — Verified Remediated"**.

---

### Bonus Proof: 2x Repeatability Demonstration (4:50 – 5:15)
- **Presenter (Dev B):**
  > *"To prove this isn't a hardcoded video or one-way mock, we click 'Reset Scenario' in our Command Center."*
- **Action:** Click **"Reset Scenario"** button in top header.
- **Screen Display:** Database flushes, `iam_staging.tf` restores to `Resource = "*"`, and dashboard reverts to clean initial state in < 1 second.
- **Presenter (Dev A):**
  > *"The entire scenario is 100% deterministic and repeatable at will."*

---

### Wrap-Up & Resilience Architecture (5:15 – 6:00)
- **Presenter (Dev A & B):**
  > *"Domain-Vihaan_X delivers an enterprise-grade visual experience backed by a resilient control plane that operates even when external LLMs or HexStrike are unavailable. Thank you, judges. We welcome your questions."*

---

## 4. Emergency Failure Recovery Runbook

| Failure Symptom | Immediate Fallback Action |
| :--- | :--- |
| **Scanner CLI fails to execute** | Toggle "Use Cached Fixtures" switch in UI header; pulls verified JSON outputs from `test_env/fixtures/`. |
| **LLM inference hangs or times out** | Click "Rule-Based Summary"; platform immediately renders pre-compiled deterministic narrative. |
| **React Flow canvas freezes** | Refresh browser (`F5`); SQLite persistence restores graph state instantly. |
| **Total machine / browser freeze** | Switch immediately to prepared backup video (`presentation/demo_backup.mp4`). |
