// apps/frontend/src/types/index.ts
/**
 * TypeScript models for Domain-Vihaan_X.
 *
 * SOURCE OF TRUTH: contracts/openapi/openapi.yaml and contracts/schemas/*.json (camelCase, bare JSON).
 * Where the UI needs something the contract does not define, it is declared separately and marked
 * PROPOSED so it can be reviewed jointly. Field names are never invented silently.
 */

export type OperatingMode = 'DEMO_MODE' | 'LIVE_ASSESSMENT_MODE';
export type AssessmentStatusValue = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
/** openapi Finding.provenance. NOTE: AGENTS.md / ADR-013 use a different vocabulary (see PR report). */
export type ProvenanceType = 'OBSERVED' | 'INFERRED' | 'SIMULATED';
export type AssetType =
  | 'REPOSITORY'
  | 'CLOUD_ACCOUNT'
  | 'DOMAIN'
  | 'WEB_APPLICATION'
  | 'API_ENDPOINT'
  | 'DATABASE';
export type Environment = 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
export type Criticality = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

/** GET /health -> HealthResponse */
export interface HealthResponse {
  status: string;
  mode: OperatingMode;
  scanners?: Record<string, unknown>;
}

export interface DigitalAsset {
  id: string;
  name: string;
  type: AssetType;
  environment: Environment;
  criticality: Criticality;
  owner: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  /** openapi: free-form string (gitleaks, checkov, trivy, subfinder, ...). */
  scanner: string;
  assetId: string;
  cveId?: string | null;
  cvssScore?: number;
  provenance: ProvenanceType;
  location?: {
    file?: string;
    line?: number;
    resource?: string;
  };
  remediationGuidance?: string;
  status: 'OPEN' | 'IN_REMEDIATION' | 'RESOLVED' | 'ACCEPTED_RISK';
  discoveredAt: string;
}

export type GraphNodeType = 'ASSET' | 'FINDING' | 'IDENTITY' | 'EXPLOIT_TARGET';
export type GraphRelationship =
  | 'STORES_CREDENTIAL_FOR'
  | 'GRANTS_ACCESS_TO'
  | 'DEPENDS_ON'
  | 'EXPOSES'
  | 'CAN_PIVOT_TO';

export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  severity?: SeverityLevel;
  /** Free-form per contract. The UI reads only `assetType` and `scanner` when present. */
  data?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: GraphRelationship;
  /** true = derived by the correlation engine; false = recorded relationship. */
  inferred: boolean;
  confidence?: number;
}

export interface SecurityGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  updatedAt: string;
}

export interface AttackPathStep {
  stepNumber: number;
  assetId: string;
  findingId?: string;
  description: string;
  technique: string;
  mitreTactic?: string;
}

/** contracts/schemas/attack-path.schema.json */
export interface AttackPath {
  id: string;
  title: string;
  summary: string;
  severity: SeverityLevel;
  confidenceScore: number;
  isSimulated: boolean;
  entryPointAssetId: string;
  crownJewelAssetId: string;
  steps: AttackPathStep[];
  status: 'ACTIVE' | 'MITIGATED';
  createdAt: string;
  /**
   * PROPOSED (not in attack-path.schema.json, which sets additionalProperties:false):
   * docs/02-architecture/API_CONTRACT.md section 3.7 documents `choke_point_asset_id`. The UI renders
   * the choke-point panel only when the backend supplies this value.
   */
  chokePointAssetId?: string;
}

export interface RemediationAction {
  id: string;
  findingId: string;
  attackPathId?: string;
  title: string;
  description: string;
  patchDiff?: string;
  shellScript?: string;
  requiresApproval: boolean;
  status: 'PENDING' | 'APPROVED' | 'APPLIED' | 'FAILED' | 'REJECTED';
  verificationStatus?: 'UNVERIFIED' | 'PASSED' | 'FAILED';
  createdAt: string;
}

export interface RemediationApproveRequest {
  approvedBy: string;
  comments?: string;
}

/** openapi AssessmentStatus. Also the declared response of POST /demo/reset. */
export interface AssessmentRun {
  id: string;
  mode: OperatingMode;
  status: AssessmentStatusValue;
  progressPercent: number;
  currentStepMessage: string;
  totalAssets: number;
  scannedAssets: number;
  findingsCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  startedAt: string;
  completedAt?: string;
}

/** Where the data on screen came from. Drives the honesty banner and badges. */
export type DataOrigin = 'SIMULATED_DEMO' | 'BACKEND_API';

/**
 * UI-only (NOT part of the API contract): excerpt shown in the finding drawer.
 * Only local preview fixtures supply it; secrets are always masked.
 */
export interface FindingEvidence {
  origin: 'SIMULATED_DEMO';
  sourceFile: string;
  excerpt: string[];
  note: string;
}
