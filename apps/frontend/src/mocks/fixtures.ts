// apps/frontend/src/mocks/fixtures.ts
/**
 * LOCAL PREVIEW FIXTURES (provenance: SIMULATED_DEMO).
 *
 * These mirror the documented synthetic scenario in data/demo/scenario.json (see the parity test in
 * fixtures.test.ts). They are NOT scanner output, NOT live telemetry and must never be presented as
 * such. Anything not specified by the scenario is omitted rather than invented.
 *
 * Preview-only additions are marked inline:
 *  - graph nodes/edges: the scenario defines relationships, not a graph payload.
 *  - evidence excerpts: masked excerpts of data/demo/mock_saas files.
 *  - remediations: illustrative diffs; the second one uses an explicit placeholder ARN.
 */

import type {
  AttackPath,
  DigitalAsset,
  FindingEvidence,
  RemediationAction,
  SecurityFinding,
  SecurityGraph,
} from '@/types';

export const PREVIEW_PROVENANCE = 'SIMULATED_DEMO' as const;

export const PREVIEW_SCENARIO = {
  id: 'demo-scenario-saas-breach',
  name: 'SaaS Cloud Breach via Leaked Staging Credential',
  source: 'data/demo/scenario.json',
  provenance: PREVIEW_PROVENANCE,
} as const;

export const PREVIEW_ASSETS: DigitalAsset[] = [
  {
    id: 'asset-repo-01',
    name: 'saas-core-api',
    type: 'REPOSITORY',
    environment: 'PRODUCTION',
    criticality: 'CRITICAL',
    owner: 'Engineering Team',
    metadata: { gitRemote: 'https://github.com/mock-saas/core-api', branch: 'main' },
    createdAt: '2026-11-14T10:00:00Z',
    updatedAt: '2026-11-14T10:00:00Z',
  },
  {
    id: 'asset-cloud-01',
    name: 'aws-production-account',
    type: 'CLOUD_ACCOUNT',
    environment: 'PRODUCTION',
    criticality: 'CRITICAL',
    owner: 'DevOps Team',
    metadata: { provider: 'AWS', accountId: '123456789012' },
    createdAt: '2026-11-14T10:00:00Z',
    updatedAt: '2026-11-14T10:00:00Z',
  },
  {
    id: 'asset-storage-01',
    name: 's3-customer-pii-vault',
    type: 'DATABASE',
    environment: 'PRODUCTION',
    criticality: 'CRITICAL',
    owner: 'Security Team',
    metadata: { arn: 'arn:aws:s3:::customer-pii-vault-prod' },
    createdAt: '2026-11-14T10:00:00Z',
    updatedAt: '2026-11-14T10:00:00Z',
  },
];

export const PREVIEW_FINDINGS: SecurityFinding[] = [
  {
    id: 'find-sec-01',
    title: 'Committed AWS IAM Secret Key in Staging Config',
    description:
      'A live AWS secret access key was detected in staging.env committed to the source repository.',
    severity: 'CRITICAL',
    scanner: 'gitleaks',
    assetId: 'asset-repo-01',
    cveId: null,
    cvssScore: 9.8,
    provenance: 'SIMULATED_DEMO',
    location: { file: 'config/staging.env', line: 14 },
    remediationGuidance:
      'Revoke compromised IAM key immediately and inject secrets via environment vault.',
    status: 'OPEN',
    discoveredAt: '2026-11-14T10:05:00Z',
  },
  {
    id: 'find-iac-01',
    title: 'Overprivileged IAM Role Allows S3 Wildcard Admin',
    description:
      'Terraform configuration grants s3:* privileges across all production buckets to developer roles.',
    severity: 'HIGH',
    scanner: 'checkov',
    assetId: 'asset-cloud-01',
    cveId: null,
    cvssScore: 8.1,
    provenance: 'SIMULATED_DEMO',
    location: { file: 'iac/iam_staging.tf', line: 28 },
    remediationGuidance: 'Restrict IAM policy to least-privilege actions on scoped resource ARNs.',
    status: 'OPEN',
    discoveredAt: '2026-11-14T10:06:00Z',
  },
];

/** Preview-only: the scenario defines relationships; this arranges them as a graph payload. */
export const PREVIEW_GRAPH: SecurityGraph = {
  nodes: [
    {
      id: 'asset-repo-01',
      label: 'saas-core-api',
      type: 'ASSET',
      severity: 'CRITICAL',
      data: { assetType: 'REPOSITORY' },
    },
    {
      id: 'find-sec-01',
      label: 'Leaked AWS secret key',
      type: 'FINDING',
      severity: 'CRITICAL',
      data: { scanner: 'gitleaks' },
    },
    {
      id: 'asset-cloud-01',
      label: 'StagingDeployer (IAM role)',
      type: 'IDENTITY',
      severity: 'HIGH',
      data: { assetType: 'CLOUD_ACCOUNT' },
    },
    {
      id: 'find-iac-01',
      label: 'S3 wildcard admin policy',
      type: 'FINDING',
      severity: 'HIGH',
      data: { scanner: 'checkov' },
    },
    {
      id: 'asset-storage-01',
      label: 's3-customer-pii-vault',
      type: 'EXPLOIT_TARGET',
      severity: 'CRITICAL',
      data: { assetType: 'DATABASE' },
    },
  ],
  edges: [
    {
      id: 'edge-repo-finding',
      source: 'asset-repo-01',
      target: 'find-sec-01',
      relationship: 'EXPOSES',
      inferred: false,
    },
    // rel-01 and rel-02 are verbatim from data/demo/relationships.json
    {
      id: 'rel-01',
      source: 'asset-repo-01',
      target: 'asset-cloud-01',
      relationship: 'STORES_CREDENTIAL_FOR',
      inferred: true,
      confidence: 0.98,
    },
    {
      id: 'edge-cloud-finding',
      source: 'asset-cloud-01',
      target: 'find-iac-01',
      relationship: 'EXPOSES',
      inferred: false,
    },
    {
      id: 'rel-02',
      source: 'asset-cloud-01',
      target: 'asset-storage-01',
      relationship: 'GRANTS_ACCESS_TO',
      inferred: true,
      confidence: 0.95,
    },
  ],
  updatedAt: '2026-11-14T10:10:00Z',
};

export const PREVIEW_ATTACK_PATHS: AttackPath[] = [
  {
    id: 'path-01',
    title: 'Public Repository Secret to Crown Jewel S3 Data Exfiltration',
    summary:
      'An attacker leverages a committed AWS key in repository staging config to assume overprivileged IAM role and exfiltrate customer PII from S3.',
    severity: 'CRITICAL',
    confidenceScore: 0.96,
    isSimulated: true,
    entryPointAssetId: 'asset-repo-01',
    crownJewelAssetId: 'asset-storage-01',
    status: 'ACTIVE',
    createdAt: '2026-11-14T10:10:00Z',
    // PROPOSED field, see types/index.ts. Preview-only value taken from API_CONTRACT.md section 3.7:
    // the IAM role is the choke point of the documented path.
    chokePointAssetId: 'asset-cloud-01',
    steps: [
      {
        stepNumber: 1,
        assetId: 'asset-repo-01',
        findingId: 'find-sec-01',
        description: 'Attacker extracts AWS credentials from git history in config/staging.env.',
        technique: 'Unsecured Credentials (T1552.001)',
        mitreTactic: 'Credential Access',
      },
      {
        stepNumber: 2,
        assetId: 'asset-cloud-01',
        findingId: 'find-iac-01',
        description: 'Attacker authenticates via CLI and assumes overprivileged StagingDeployer role.',
        technique: 'Valid Accounts (T1078)',
        mitreTactic: 'Privilege Escalation',
      },
      {
        stepNumber: 3,
        assetId: 'asset-storage-01',
        description:
          'Attacker dumps sensitive customer PII records from s3://customer-pii-vault-prod.',
        technique: 'Data from Cloud Storage Object (T1530)',
        mitreTactic: 'Exfiltration',
      },
    ],
  },
];

/**
 * Preview-only illustrative remediations. Diff hunks follow the real synthetic files under
 * data/demo/mock_saas/. The secret is masked; the IAM scope uses an explicit placeholder.
 */
export const PREVIEW_REMEDIATIONS: RemediationAction[] = [
  {
    id: 'rem-01',
    findingId: 'find-sec-01',
    attackPathId: 'path-01',
    title: 'Remove the committed secret and load it from a secret vault',
    description:
      'Replaces the hard-coded value with a vault reference. The exposed key must also be revoked in IAM; rotating it is a separate manual step outside this patch.',
    patchDiff: [
      '--- a/config/staging.env',
      '+++ b/config/staging.env',
      '@@ -12 +12 @@',
      '-AWS_SECRET_ACCESS_KEY=wJal****************EKEY',
      '+AWS_SECRET_ACCESS_KEY=${SECRET_VAULT_AWS_KEY}',
    ].join('\n'),
    requiresApproval: true,
    status: 'PENDING',
    verificationStatus: 'UNVERIFIED',
    createdAt: '2026-11-14T10:12:00Z',
  },
  {
    id: 'rem-02',
    findingId: 'find-iac-01',
    attackPathId: 'path-01',
    title: 'Scope the IAM policy to least privilege',
    description:
      'Replaces the s3:* wildcard on all resources with an explicit action list and a scoped resource ARN. The ARN below is a placeholder that a human must fill in.',
    patchDiff: [
      '--- a/iac/iam_staging.tf',
      '+++ b/iac/iam_staging.tf',
      '@@ -38,3 +38,3 @@',
      '         Effect   = "Allow"',
      '-        Action   = "s3:*"',
      '-        Resource = "*"',
      '+        Action   = ["s3:GetObject", "s3:PutObject"]',
      '+        Resource = "arn:aws:s3:::<scoped-staging-bucket>/*"',
    ].join('\n'),
    requiresApproval: true,
    status: 'PENDING',
    verificationStatus: 'UNVERIFIED',
    createdAt: '2026-11-14T10:12:00Z',
  },
];

/** UI-only evidence excerpts. Secrets masked; text comes from the synthetic mock_saas files. */
export const PREVIEW_EVIDENCE: Record<string, FindingEvidence> = {
  'find-sec-01': {
    origin: 'SIMULATED_DEMO',
    sourceFile: 'data/demo/mock_saas/repo/config/staging.env',
    excerpt: [
      '# SYNTHETIC DEMO AWS CREDENTIALS - DO NOT USE IN PRODUCTION',
      'AWS_ACCESS_KEY_ID=AKIA****************MPLE',
      'AWS_SECRET_ACCESS_KEY=wJal****************EKEY',
    ],
    note: 'Synthetic fixture. Values are masked, and this is not scanner output.',
  },
  'find-iac-01': {
    origin: 'SIMULATED_DEMO',
    sourceFile: 'data/demo/mock_saas/iac/iam_staging.tf',
    excerpt: ['Effect   = "Allow"', 'Action   = "s3:*"', 'Resource = "*"'],
    note: 'Synthetic fixture excerpt, not checkov output.',
  },
};
