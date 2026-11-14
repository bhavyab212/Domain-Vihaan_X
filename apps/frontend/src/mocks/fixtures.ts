// apps/frontend/src/mocks/fixtures.ts
/**
 * Deterministic Mock Fixtures for Frontend Demo Mode and Offline Development.
 * Matches the canonical scenarios in data/demo/scenario.json and contracts/examples/.
 */

import { DigitalAsset, SecurityFinding, SecurityGraph, AttackPath, RemediationAction, AssessmentRun } from '../types';

export const MOCK_ASSETS: DigitalAsset[] = [
  {
    id: 'asset-repo-01',
    name: 'saas-core-api',
    type: 'REPOSITORY',
    environment: 'PRODUCTION',
    criticality: 'CRITICAL',
    owner: 'Engineering Team',
    createdAt: '2026-11-14T10:00:00Z',
    updatedAt: '2026-11-14T10:00:00Z',
    metadata: { gitRemote: 'https://github.com/mock-saas/core-api', branch: 'main' }
  },
  {
    id: 'asset-cloud-01',
    name: 'aws-production-account',
    type: 'CLOUD_ACCOUNT',
    environment: 'PRODUCTION',
    criticality: 'CRITICAL',
    owner: 'DevOps Team',
    createdAt: '2026-11-14T10:00:00Z',
    updatedAt: '2026-11-14T10:00:00Z',
    metadata: { provider: 'AWS', accountId: '123456789012' }
  },
  {
    id: 'asset-storage-01',
    name: 's3-customer-pii-vault',
    type: 'DATABASE',
    environment: 'PRODUCTION',
    criticality: 'CRITICAL',
    owner: 'Security Team',
    createdAt: '2026-11-14T10:00:00Z',
    updatedAt: '2026-11-14T10:00:00Z',
    metadata: { arn: 'arn:aws:s3:::customer-pii-vault-prod' }
  }
];

export const MOCK_FINDINGS: SecurityFinding[] = [
  {
    id: 'find-sec-01',
    title: 'Committed AWS IAM Secret Key in Staging Config',
    description: 'A live AWS secret access key was detected in staging.env committed to the source repository.',
    severity: 'CRITICAL',
    scanner: 'gitleaks',
    assetId: 'asset-repo-01',
    provenance: 'SIMULATED',
    location: { file: 'config/staging.env', line: 14 },
    status: 'OPEN',
    discoveredAt: '2026-11-14T10:05:00Z',
    remediationGuidance: 'Revoke compromised IAM key immediately and inject secrets via environment vault.'
  },
  {
    id: 'find-iac-01',
    title: 'Overprivileged IAM Role Allows S3 Wildcard Admin',
    description: 'Terraform configuration grants s3:* privileges across all production buckets to developer roles.',
    severity: 'HIGH',
    scanner: 'checkov',
    assetId: 'asset-cloud-01',
    provenance: 'SIMULATED',
    location: { file: 'iac/iam_staging.tf', line: 28 },
    status: 'OPEN',
    discoveredAt: '2026-11-14T10:06:00Z',
    remediationGuidance: 'Restrict IAM policy to least-privilege actions on scoped resource ARNs.'
  }
];

export const MOCK_GRAPH: SecurityGraph = {
  nodes: [
    { id: 'asset-repo-01', label: 'saas-core-api (Repo)', type: 'ASSET', severity: 'CRITICAL', data: {} },
    { id: 'find-sec-01', label: 'Leaked AWS Key', type: 'FINDING', severity: 'CRITICAL', data: {} },
    { id: 'asset-cloud-01', label: 'AWS IAM Role (Overprivileged)', type: 'IDENTITY', severity: 'HIGH', data: {} },
    { id: 'asset-storage-01', label: 'Customer PII Vault (S3)', type: 'EXPLOIT_TARGET', severity: 'CRITICAL', data: {} }
  ],
  edges: [
    { id: 'e-1-2', source: 'asset-repo-01', target: 'find-sec-01', relationship: 'EXPOSES', inferred: false },
    { id: 'e-2-3', source: 'find-sec-01', target: 'asset-cloud-01', relationship: 'STORES_CREDENTIAL_FOR', inferred: true, confidence: 0.98 },
    { id: 'e-3-4', source: 'asset-cloud-01', target: 'asset-storage-01', relationship: 'GRANTS_ACCESS_TO', inferred: true, confidence: 0.95 }
  ],
  updatedAt: '2026-11-14T10:10:00Z'
};

export const MOCK_ATTACK_PATHS: AttackPath[] = [
  {
    id: 'path-01',
    title: 'Public Repository Secret to Crown Jewel S3 Data Exfiltration',
    summary: 'An attacker leverages a committed AWS key in repository staging config to assume overprivileged IAM role and exfiltrate customer PII from S3.',
    severity: 'CRITICAL',
    confidenceScore: 0.96,
    isSimulated: true,
    entryPointAssetId: 'asset-repo-01',
    crownJewelAssetId: 'asset-storage-01',
    status: 'ACTIVE',
    createdAt: '2026-11-14T10:10:00Z',
    steps: [
      {
        stepNumber: 1,
        assetId: 'asset-repo-01',
        findingId: 'find-sec-01',
        description: 'Attacker extracts AWS credentials from git history in config/staging.env.',
        technique: 'Unsecured Credentials (T1552.001)',
        mitreTactic: 'Credential Access'
      },
      {
        stepNumber: 2,
        assetId: 'asset-cloud-01',
        findingId: 'find-iac-01',
        description: 'Attacker authenticates via CLI and assumes overprivileged StagingDeployer role.',
        technique: 'Valid Accounts (T1078)',
        mitreTactic: 'Privilege Escalation'
      },
      {
        stepNumber: 3,
        assetId: 'asset-storage-01',
        description: 'Attacker dumps sensitive customer PII records from s3://customer-pii-vault-prod.',
        technique: 'Data from Cloud Storage Object (T1530)',
        mitreTactic: 'Exfiltration'
      }
    ]
  }
];

export const MOCK_REMEDIATIONS: RemediationAction[] = [
  {
    id: 'rem-01',
    findingId: 'find-sec-01',
    attackPathId: 'path-01',
    title: 'Revoke AWS Access Key and Remove from Git History',
    description: 'Safely invalidates the leaked IAM user key and creates an environment secret template.',
    patchDiff: `--- a/config/staging.env
+++ b/config/staging.env
@@ -13,2 +13,2 @@
-AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
+AWS_SECRET_ACCESS_KEY="\${SECRET_VAULT_AWS_KEY}"`,
    requiresApproval: true,
    status: 'PENDING',
    createdAt: '2026-11-14T10:12:00Z'
  }
];

export const MOCK_ASSESSMENT_RUN: AssessmentRun = {
  id: 'run-demo-01',
  mode: 'DEMO_MODE',
  status: 'completed',
  progressPercent: 100,
  currentStepMessage: 'Demo scenario loaded and verified.',
  totalAssets: 3,
  scannedAssets: 3,
  findingsCount: 2,
  criticalCount: 1,
  highCount: 1,
  mediumCount: 0,
  lowCount: 0,
  startedAt: '2026-11-14T10:00:00Z',
  completedAt: '2026-11-14T10:00:05Z'
};
