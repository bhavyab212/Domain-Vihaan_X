# System Architecture Blueprint — Domain-Vihaan_X

> **Document ID:** ARCH-001  
> **Project Name:** Domain-Vihaan_X  
> **Domain:** Cybersecurity (VIHAAN X Hackathon)  
> **Document Status:** PROPOSED (Updated for Judging-First & Dual-Mode Strategy)  
> **Author:** Principal Software Architect & Cybersecurity Lead  
> **Last Updated:** 2026-11-15T00:24:00+05:30  
> **Target Release:** Hackathon MVP (v0.1.0)  
> **Core Strategic Philosophy:** **Frontend-first. Backend-reliable. Demo-driven.**  

---

## 1. High-Level Architectural Model (C4 Level 1: System Context)

The system context diagram illustrates how users, evaluators, and external security environments interact with **Domain-Vihaan_X**:

```mermaid
C4Context
    title System Context Diagram for Domain-Vihaan_X (Judging-First Architecture)

    Person(developer, "Software / DevOps Engineer", "Configures assets, approves remediations, and reviews attack paths.")
    Person(founder, "SaaS Founder / Hackathon Judge", "Inspects executive risk posture, Business Security Graph, and attack paths.")

    System(domain_vihaan, "Domain-Vihaan_X Platform", "Unified cybersecurity intelligence platform providing interactive graph visualization, deterministic contextual scoring, and verifiable remediation.")

    System_Ext(synthetic_env, "Synthetic Test Environment", "Isolated local fixtures (test_env/mock_saas/) providing deterministic Demo Mode.")
    System_Ext(live_scanners, "Authorized Live Scanners", "Gitleaks, Trivy, Checkov, Subfinder executed via isolated subprocesses.")
    System_Ext(hexstrike, "HexStrike-AI Execution Worker", "Optional underlying DAST/MCP execution worker; platform operates independently if absent.")
    System_Ext(llm, "External LLM API (Optional)", "Structured analysis provider; automatically falls back to embedded rule engine if offline.")

    Rel(founder, domain_vihaan, "Inspects Command Center & Interactive Graph", "HTTPS / Web UI")
    Rel(developer, domain_vihaan, "Approves remediations, tracks live scans", "HTTPS / Web UI")

    Rel(domain_vihaan, synthetic_env, "Loads deterministic scenario & resets state", "Local File I/O")
    Rel(domain_vihaan, live_scanners, "Orchestrates live scans with 60s timeout", "Subprocess (shell=False)")
    Rel(domain_vihaan, hexstrike, "Dispatches authorized web checks", "Localhost REST (127.0.0.1)")
    Rel(domain_vihaan, llm, "Requests path narrative (graceful fallback)", "HTTPS / TLS")
```

---

## 2. Container Diagram (C4 Level 2: Platform Containers)

The platform is strictly organized into three distinct tiers: the **Five-Interface Frontend Layer**, the **Dual-Mode Resilient Control Plane**, and the **Isolated Sandboxed Execution Plane**:

```mermaid
graph TD
    subgraph FrontendTier ["Frontend Presentation Tier (React 18 + Vite + Tailwind CSS)"]
        UI1["1. Security Command Center<br/>(KPI Cards, Risk Velocity, Demo Reset)"]
        UI2["2. Business Security Graph<br/>(React Flow Canvas, Pulsating Paths)"]
        UI3["3. Threat & Findings Center<br/>(High-Density Triage, Evidence Drawer)"]
        UI4["4. Attack Path Investigation<br/>(Kill-Chain Breakdown, Choke Points)"]
        UI5["5. AI Remediation Center<br/>(Diff Viewer, Approval Modal, Re-scan)"]
    end

    subgraph ControlPlane ["Control Plane (FastAPI ASGI / Python 3.11+ / SQLite WAL)"]
        APIRouter["FastAPI REST Router & Schema Validator"]
        ModeManager["Dual-Mode Controller (DEMO_MODE vs LIVE_MODE)"]
        DemoProvider["Deterministic Demo Scenario Provider<br/>(One-Click Reset & Fixtures)"]
        GraphEngine["Business Security Graph Engine<br/>(NetworkX In-Memory Model)"]
        RiskEngine["Contextual Risk Scorer<br/>(Deterministic Formula 0.0-10.0)"]
        RuleFallback["Embedded Rule-Based AI Fallback Engine<br/>(Zero Network Dependency)"]
        RemediationSupervisor["Remediation & Verification Supervisor<br/>(Human Approval Gate)"]
        SQLiteDB[("SQLite Database<br/>(WAL Mode, Audit Events)")]
    end

    subgraph ExecutionPlane ["Sandboxed Execution Plane (Host / Docker Subprocesses)"]
        AllowlistGuard["Target Allowlist Policy Guard"]
        CLI_Runners["Direct Scanner Runners<br/>(Gitleaks, Checkov, Trivy, Subfinder)"]
        HexStrikeBridge["HexStrike-AI Adapter<br/>(Localhost 127.0.0.1 REST)"]
    end

    FrontendTier -->|"REST JSON API (Port 8000)"| APIRouter
    APIRouter --> ModeManager
    ModeManager --> DemoProvider
    ModeManager --> AllowlistGuard
    APIRouter --> GraphEngine
    APIRouter --> RiskEngine
    APIRouter --> RuleFallback
    APIRouter --> RemediationSupervisor
    APIRouter --> SQLiteDB

    AllowlistGuard --> CLI_Runners
    AllowlistGuard --> HexStrikeBridge
```

---

## 3. Dual-Mode Operational Data Flows

### 3.1 Demo Mode Data Flow (Deterministic & Offline)
```mermaid
sequenceDiagram
    autonumber
    actor Judge as Evaluator / User
    participant UI as React UI (Command Center)
    participant API as FastAPI Control Plane
    participant Demo as Demo Scenario Provider
    participant Graph as NetworkX Graph Engine
    participant Fallback as Rule AI Engine
    participant DB as SQLite DB

    Judge->>UI: Clicks "Initialize Demo Scenario" (or "Reset")
    UI->>API: POST /api/demo/reset
    API->>Demo: load_synthetic_saas_scenario()
    Demo->>DB: Seed 3 Assets, 2 Relationships, 2 Findings
    Demo->>Graph: Build Initial Graph State
    API-->>UI: Scenario Ready (Status: READY)
    Judge->>UI: Clicks "Run Assessment"
    UI->>API: POST /api/assessments (mode=DEMO)
    API->>Graph: Compute Attack Path (DFS)
    Graph-->>API: 1 Critical Path (Repo -> Key -> Role -> S3)
    API->>Fallback: generate_grounded_explanation()
    Fallback-->>API: Structured Kill-Chain Narrative
    API-->>UI: Assessment Complete (Instant / 2s Turnaround)
    UI-->>Judge: Signature Business Security Graph Rendered
```

### 3.2 Live Assessment Mode Data Flow (Real Tools)
```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer / Operator
    participant UI as React UI
    participant API as FastAPI Control Plane
    participant Guard as Target Allowlist Guard
    participant Proc as Scanner Subprocess Runner
    participant Norm as Normalization Engine
    participant DB as SQLite DB

    Dev->>UI: Registers Target Asset & Triggers Live Scan
    UI->>API: POST /api/assessments (mode=LIVE)
    API->>Guard: validate_target(locator)
    Guard-->>API: Target Approved
    API->>Proc: run([gitleaks, checkov], timeout=60s)
    Proc-->>API: Raw Telemetry JSON
    API->>Norm: normalize(FindingSchema)
    Norm->>DB: Save Findings (provenance=SCANNER_VERIFIED)
    API-->>UI: Live Progress & Findings Rendered
```

---

## 4. Resilience & Graceful Degradation Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RESILIENCE SUPERVISORY MATRIX                   │
├───────────────────────────────┬────────────────────────────────────────┤
│ Failure Scenario              │ Autonomous Degradation Action          │
├───────────────────────────────┼────────────────────────────────────────┤
│ 1. HexStrike Service Down     │ Adapter detects `ConnectionRefused`;   │
│                               │ logs warning; dispatches native CLI    │
│                               │ runners; platform operates seamlessly. │
├───────────────────────────────┼────────────────────────────────────────┤
│ 2. External LLM Timeout (> 5s)│ Timeout guard aborts remote HTTP call; │
│    or Internet Disconnection  │ invokes embedded `RuleBasedAI` engine; │
│                               │ returns structured narrative card.     │
├───────────────────────────────┼────────────────────────────────────────┤
│ 3. Scanner Binary Hanging     │ Subprocess supervisor issues `SIGKILL` │
│                               │ at 60s; marks `ScanExecution(TIMED_OUT)│
│                               │ preserves partial results in DB.       │
├───────────────────────────────┼────────────────────────────────────────┤
│ 4. Corrupted Scanner JSON     │ Quarantines malformed string in DB;    │
│                               │ normalizer continues parsing valid     │
│                               │ tool outputs without crashing.         │
├───────────────────────────────┼────────────────────────────────────────┤
│ 5. Browser Refresh During Scan│ UI polling hook (`useScanStatus`)      │
│                               │ reads live state from SQLite; restores │
│                               │ progress bar seamlessly.               │
├───────────────────────────────┼────────────────────────────────────────┤
│ 6. Remediation Fix Incomplete │ Automated re-scan detects finding still│
│                               │ present; sets `REMEDIATION_INCOMPLETE` │
│                               │ keeps attack edge red; alerts user.    │
└───────────────────────────────┴────────────────────────────────────────┘
```

---

## 5. Signature Feature: The Business Security Graph

The **Business Security Graph** is the central visual centerpiece evaluated by hackathon judges.

### Visual Architecture & React Flow Styling
- **Node Classification:**
  - `AssetNode`: Renders digital assets with type icon (`Repository`, `CloudStorage`, `IAMRole`, `Domain`), environment badge (`Production`, `Staging`), and criticality indicator.
  - `FindingNode`: Renders vulnerability cards with severity badge (`Critical: Crimson`, `High: Amber`), rule identifier, and contextual risk score.
- **Edge Classification:**
  - `OperationalEdge`: Solid subtle line representing normal infrastructure dependencies (`DEPLOYS_TO`, `STORES_DATA_IN`).
  - `AttackEdge`: **Pulsating Red Animated Edge** indicating an active, exploitable kill chain.
  - `SeveredEdge`: **Solid Emerald Green Edge** indicating a verified, remediated relationship.
- **Interactive Capabilities:**
  - Interactive drag, pan, zoom, and minimap navigation.
  - Clicking any node opens the **Inspector Drawer** displaying deep metadata and evidence provenance.
  - Clicking an attack path in the sidebar automatically focuses and zooms the canvas onto the active kill chain.

---

## 6. Closed-Loop Remediation Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer / Judge
    participant UI as Remediation Center Studio
    participant API as FastAPI Control Plane
    participant Patch as Patch Execution Worker
    participant Runner as Verification Re-scanner
    participant Graph as NetworkX Graph Engine

    Dev->>UI: Inspects AI Policy Diff & Clicks "Approve & Execute"
    UI->>API: POST /api/remediations/{id}/approve
    API->>API: Record Approval in Audit Log (User + Timestamp)
    API->>Patch: apply_diff(target_file, unified_diff)
    Patch->>Patch: Modify mock_saas/iac/iam_staging.tf
    Patch->>Runner: trigger_targeted_rescan(asset_id)
    Runner->>Runner: Run Checkov against patched file (< 3s)
    Runner-->>Patch: Scan Result (CKV_AWS_62 Resolved)
    Patch->>Graph: sever_edge(source, target)
    Graph->>Graph: Recalculate Paths (0 Critical Paths Remaining)
    Patch->>API: Update Status: VERIFIED_RESOLVED
    API-->>UI: Push Status: Attack Path Severed
    UI-->>Dev: Graph Edge Turns Green / Success Animation Rendered
```
