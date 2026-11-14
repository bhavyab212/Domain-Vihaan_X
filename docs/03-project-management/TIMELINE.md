# Project Execution Timeline & Milestone Schedule — Domain-Vihaan_X

> **Document ID:** TIME-001  
> **Project Name:** Domain-Vihaan_X  
> **Domain:** Cybersecurity (VIHAAN X Hackathon)  
> **Timezone:** Indian Standard Time (IST, UTC+5:30)  
> **Current Date/Time:** November 15, 2026, 00:30 IST  
> **Critical Submission / Demo Deadline:** **November 15, 2026, 09:00 AM IST**  
> **Total Remaining Time Window:** ~8.5 Hours  
> **Core Strategic Philosophy:** **Frontend-first. Backend-reliable. Demo-driven.**  

---

## 1. High-Level Master Schedule Overview

To guarantee 100% demo stability and an impressive evaluation presentation, development prioritizes an unshakeable vertical slice connecting the **Five Primary Interfaces** to a reliable backend operating in **Demo Mode** with seamless one-click reset:

```
[15 Nov 00:00 - 01:00]──► Milestone 0: Documentation Revision & Strategy Sign-Off (COMPLETE)
        │
[15 Nov 01:00 - 02:30]──► Milestone 1: Dual-Track Scaffolding, Synthetic Fixtures & One-Click Reset
        │
[15 Nov 02:30 - 05:00]──► Milestone 2: Core Vertical Slice (React Flow Graph + Command Center + NetworkX)
        │
[15 Nov 05:00 - 06:45]──► Milestone 3: Threat Center, Path Investigation & Grounded AI Analysis
        │
[15 Nov 06:45 - 07:45]──► Milestone 4: Remediation Studio, Approval Modal & Verification Rescan Loop
        │
[15 Nov 07:45 - 08:30]──► Milestone 5: 2x Repeatable Demo Rehearsal & Screen Recording Backup
        │
[15 Nov 08:30 - 09:00]──► Milestone 6: Hard Deadline Submission & Evaluation Presentation
```

---

## 2. Milestone Breakdown & Delivery Matrix

### Milestone 0: Documentation Baseline & Judging-First Revision
- **Time Window:** Nov 14, 23:00 IST – Nov 15, 01:00 IST
- **Primary Owner:** Joint (Dev A & Dev B)
- **Deliverables:** Complete 23-document architecture and governance system updated with the Judging-First strategy, 5 primary UIs, dual modes, and resilience specifications.
- **Dependencies:** None.
- **Status:** **COMPLETE**

---

### Milestone 1: Dual-Track Scaffolding, Synthetic Fixtures & Reset Loop
- **Time Window:** Nov 15, 01:00 IST – Nov 15, 02:30 IST (Duration: 1.5 Hours)
- **Primary Owners:**
  - Dev A: FastAPI backend skeleton, SQLite database init script, `POST /api/demo/reset` endpoint, and `test_env/mock_saas/` fixtures.
  - Dev B: React 18 + Vite + Tailwind CSS layout shell, navigation bar with `[DEMO MODE]` badge, and API client.
- **Deliverables:**
  - `GET /api/health` returns `200 OK`.
  - `POST /api/demo/reset` flushes and reseeds mock SaaS assets in < 1 second.
  - Frontend shell running on `localhost:3000` consuming backend health and asset APIs.
- **Dependencies:** Milestone 0 sign-off.
- **Status:** READY TO START
- **Completion Criteria:** One-click reset verified from frontend button triggering backend fixture reset.

---

### Milestone 2: Signature Feature Build — The Business Security Graph & Command Center
- **Time Window:** Nov 15, 02:30 IST – Nov 15, 05:00 IST (Duration: 2.5 Hours)
- **Primary Owners:**
  - Dev A: Finding Normalizer (`FindingSchema`), NetworkX graph model, DFS attack-path traversal, Contextual Risk Scorer ($0.0 - 10.0$).
  - Dev B: React Flow interactive canvas (`@xyflow/react`), custom `AssetNode` and `FindingNode` components, pulsating red kill-chain edge styling, and Security Command Center KPI cards.
- **Deliverables:**
  - `GET /api/graph/{id}` serving serialized React Flow nodes and edges.
  - Interactive canvas supporting dragging, zooming, minimap navigation, and node inspection clicks.
  - Attack path algorithmically detected from synthetic assets and highlighted in red.
- **Dependencies:** Milestone 1 complete.
- **Status:** BLOCKED (Pending M1)
- **Completion Criteria:** Evaluator viewing canvas immediately sees and understands the 3-hop attack path.

---

### Milestone 3: Threat Center, Path Investigation & Grounded AI Explanations
- **Time Window:** Nov 15, 05:00 IST – Nov 15, 06:45 IST (Duration: 1 Hour 45 Minutes)
- **Primary Owners:**
  - Dev A: Gitleaks/Checkov CLI subprocess runners, `RuleBasedExplanationEngine` (offline deterministic AI), and live LLM client wrapper.
  - Dev B: Threat & Findings Center (high-density table with search, severity filters, provenance badges) and Attack Path Investigation drawer.
- **Deliverables:**
  - Findings table rendering secret and IaC findings with `[SIMULATED]` badges.
  - Investigation drawer showing hop-by-hop breakdown and choke-point calculation.
  - AI analysis card rendering clear narrative with zero network latency.
- **Dependencies:** Milestone 2 complete.
- **Status:** BLOCKED (Pending M2)
- **Completion Criteria:** AI analysis renders cleanly even when disconnected from the internet.

---

### Milestone 4: Remediation Center Studio, Approval Gate & Automated Verification
- **Time Window:** Nov 15, 06:45 IST – Nov 15, 07:45 IST (Duration: 1.0 Hour)
- **Primary Owners:**
  - Dev A: Patch application worker, `POST /api/remediations/{id}/approve` & `execute`, automated Checkov re-scan, and edge-severing logic.
  - Dev B: AI Remediation Center view, unified code diff card, human approval confirmation dialog, and green "SEVERED" success animation.
- **Deliverables:**
  - Full remediation loop: Review diff -> Approve -> Execute patch -> Auto re-scan -> Attack path severed.
- **Dependencies:** Milestone 3 complete.
- **Status:** BLOCKED (Pending M3)
- **Completion Criteria:** Clicking approve applies the fix to `iam_staging.tf`, re-scans, and turns the graph edge green without page reload.

---

### Milestone 5: Repeatable Demo Rehearsal & Contingency Recording
- **Time Window:** Nov 15, 07:45 IST – Nov 15, 08:30 IST (Duration: 45 Minutes)
- **Primary Owners:** Joint (Dev A & Dev B)
- **Deliverables:**
  - **Mandatory Repeatability Test:** Full 12-stage demo executed, verified, reset via `POST /api/demo/reset`, and repeated from clean state at least twice.
  - High-resolution screen recording (`presentation/demo_backup.mp4`) captured.
  - Pitch deck slides aligned with the working software.
- **Dependencies:** Milestone 4 complete.
- **Status:** BLOCKED (Pending M4)
- **Completion Criteria:** Demonstration completes in < 5 minutes twice consecutively with zero errors.

---

### Milestone 6: Hard Deadline Submission & Live Evaluation
- **Hard Deadline:** **November 15, 2026, 09:00 AM IST**
- **Primary Owner:** Joint
- **Deliverables:** Final portal submission, live judge walkthrough.
