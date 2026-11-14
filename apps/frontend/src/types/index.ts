// apps/frontend/src/types/index.ts
/**
 * Shared TypeScript type definitions for Domain-Vihaan_X Frontend.
 * These types reflect the contracts defined in contracts/schemas/ and docs/02-architecture/DATA_MODEL.md.
 */

export type OperatingMode = 'DEMO_MODE' | 'LIVE_ASSESSMENT_MODE';
export type AssessmentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';
export type ProvenanceType = 'OBSERVED' | 'INFERRED' | 'SIMULATED';
export type AssetType = 'REPOSITORY' | 'CLOUD_ACCOUNT' | 'DOMAIN' | 'WEB_APPLICATION' | 'API_ENDPOINT' | 'DATABASE';

export interface DigitalAsset {
  id: string;
  name: string;
  type: AssetType;
  environment: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';
  criticality: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
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
  scanner: 'gitleaks' | 'checkov' | 'trivy' | 'subfinder' | 'manual';
  assetId: string;
  cveId?: string;
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

export interface GraphNode {
  id: string;
  label: string;
  type: 'ASSET' | 'FINDING' | 'IDENTITY' | 'EXPLOIT_TARGET';
  severity?: SeverityLevel;
  data: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: 'STORES_CREDENTIAL_FOR' | 'GRANTS_ACCESS_TO' | 'DEPENDS_ON' | 'EXPOSES' | 'CAN_PIVOT_TO';
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

export interface AssessmentRun {
  id: string;
  mode: OperatingMode;
  status: AssessmentStatus;
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
