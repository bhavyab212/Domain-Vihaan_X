# Hackathon Pitch Narrative & Slide Outline — Domain-Vihaan_X

> **Document ID:** PITCH-001  
> **Project Name:** Domain-Vihaan_X  
> **Event:** VIHAAN X Hackathon (Cybersecurity Track)  
> **Format:** 5-Minute Pitch Deck + 2-Minute Live Demo  
> **Status:** PROPOSED PITCH DECK STRUCTURE  
> **Last Updated:** 2026-11-15T00:04:00+05:30  

---

## Slide 1: Title & The Hook (30 Seconds)
- **Visual:** High-contrast dark theme graphic showing a spiderweb of code, cloud, and perimeter assets with a glowing red attack path.
- **Title:** **Domain-Vihaan_X**
- **Subtitle:** *Unified Cybersecurity Intelligence & Cross-Domain Attack-Path Correlation for Modern Software Teams.*
- **The Hook (Speaker):**
  > *"Every 11 seconds, a software company experiences an unauthorized access incident. Not because they lacked security tools, but because their tools told them 200 disconnected stories, and nobody connected the dots before the attacker did."*

---

## Slide 2: The Problem: The Fragmented Digital Reality (45 Seconds)
- **Visual:** Three separate silos: Git Repositories (Code), AWS/Cloud (Infrastructure), and Public Domains (Perimeter) with red alert badges everywhere.
- **Key Points:**
  - Startups and software agencies operate across fragmented environments: GitHub, AWS, Docker, DNS, and external APIs.
  - They run scanners like Gitleaks, Trivy, and Checkov.
  - **The Result:** 300-row CSV spreadsheets, alert fatigue, and zero contextual awareness.
  - A leaked test key in code and an overly permissive S3 policy in cloud look like two minor, unlinked alerts—until an attacker links them together.

---

## Slide 3: The Breakthrough: The Business Security Graph (45 Seconds)
- **Visual:** React Flow screenshot showing assets (Repositories, IAM Roles, S3 Buckets, Domains) interconnected by directed relationships, highlighting an active red kill chain.
- **The Core Value Proposition:**
  > *"Connect fragmented security findings, understand their relationships, identify business-critical attack paths, and guide safe, verified remediation."*
- **How It Works:**
  - Ingests telemetry across **Application Security**, **Infrastructure Security**, and **External Attack Surface**.
  - Normalizes findings into a single unified schema.
  - Builds an interactive property graph modeling real operational dependencies.
  - Evaluates multi-hop attack paths from external ingress to critical business data.

---

## Slide 4: Real-Time Architecture & Defense-in-Depth (45 Seconds)
- **Visual:** C4 architecture diagram illustrating the clean separation of the Control Plane and the Execution Plane.
- **Key Architectural Highlights:**
  - **Control Plane:** FastAPI (Python 3.11+), SQLite in WAL mode, NetworkX graph engine, deterministic Contextual Risk Scorer (CRS).
  - **Execution Plane:** Isolated subprocess runners with strict 60s timeouts, parameterization (`shell=False`), and target allowlists.
  - **HexStrike-AI Integration:** Relegated strictly to an underlying execution worker behind a hardened localhost adapter; our platform owns the intelligence.
  - **Grounded AI Engine:** Zero-hallucination structured prompt contracts explaining verified kill chains without speculative fabrication.

---

## Slide 5: The Working Live Demonstration (90 Seconds)
- **Live Action:** Switch to browser showing live software running on `localhost:3000`:
  1. **The Synthetic SaaS Setup:** Show AcmeCloud's registered repository, IAM role, and S3 bucket.
  2. **The Scan:** Trigger multi-domain assessment; show real-time normalization.
  3. **The Discovery:** Reveal the Business Security Graph; highlight the red 3-hop attack path leading from leaked key to database backup exfiltration.
  4. **The Fix:** Review the AI-generated IAM policy diff; click **"Approve & Execute"**.
  5. **The Verification:** Watch automated re-scan sever the graph edge and transition status to **`RESOLVED`**.

---

## Slide 6: Competitive Differentiation & Market Moat (30 Seconds)
- **Visual:** 2x2 competitive quadrant (Cost vs. Cross-Domain Graph Intelligence).
- **Positioning:**
  - *Enterprise CSPMs (Wiz, Orca):* $50,000+/year, heavy enterprise agents, overwhelming for lean engineering teams.
  - *Single-Point Scanners (Snyk, Gitleaks):* Inexpensive, but completely blind to cross-domain cloud relationships.
  - *Domain-Vihaan_X:* The only developer-native, graph-based security intelligence platform designed for startups and agencies, providing closed-loop human-approved verification at 1/10th the cost.

---

## Slide 7: Current Status, Limitations & Future Roadmap (30 Seconds)
- **Current MVP Status (v0.1.0):**
  - [x] In-memory NetworkX Business Security Graph.
  - [x] Deterministic Contextual Risk Scoring engine.
  - [x] Gitleaks, Checkov, Trivy, and Subfinder adapters.
  - [x] Supervised human-in-the-loop remediation and verification re-scan.
- **Honest Limitations:**
  - Currently operates against local synthetic environments and git checkouts rather than continuous live AWS CloudTrail streams.
- **Future Roadmap:**
  - v0.2.0: GitHub App bot for automated PR comments; AWS IAM AssumeRole connector.
  - v1.0.0: PostgreSQL + Neo4j graph database migration, multi-tenant SaaS.

---

## Slide 8: Conclusion & Call to Action (15 Seconds)
- **Visual:** Clean branding slide with team names, GitHub repository URL, and QR code to repository.
- **Closing Statement:**
  > *"Security shouldn't be about drowning in 500 alerts. It should be about understanding your business graph, severing lethal attack paths, and proving you're secure. We are Domain-Vihaan_X. Thank you!"*
