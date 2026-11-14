/**
 * Pure posture tallies for the Security Command Center. No React, no network.
 *
 * Every number is a COUNT of records a data source returned. There is deliberately no posture score, risk score,
 * trend or velocity here: none is supplied by the API, and inventing one in the browser would present a made-up
 * number as a security fact. If the backend later provides a score, display and cite it; do not compute it here.
 */

import type { AttackPath, DigitalAsset, RemediationAction, SecurityFinding, SecurityGraph, SeverityLevel } from '@/types';
import { SEVERITY_ORDER } from '@/lib/utils/severity';
import { outcomeOf, type Outcome } from '@/features/remediation/lifecycle';

export interface PostureInput {
  assets: DigitalAsset[];
  findings: SecurityFinding[];
  /** null = the endpoint failed or is not available (distinct from "returned an empty list"). */
  paths: AttackPath[] | null;
  graph: SecurityGraph | null;
  remediations: RemediationAction[] | null;
}

export type CountSource = 'inventory' | 'graph';

export interface AssetKpi {
  count: number;
  /** Where the number came from, so the UI can say so. */
  source: CountSource;
  /** True when /assets returned nothing but the graph contains asset nodes. */
  inventoryEmptyButGraphHasAssets: boolean;
}

export interface FindingKpi {
  /** Open findings by severity, from the findings LIST only. */
  openBySeverity: Record<SeverityLevel, number>;
  openTotal: number;
  total: number;
  /** Findings the graph says exist on assets (sum of asset `findingsCount`), when the list is empty. */
  graphReportedCount: number | null;
  listEmptyButGraphReportsFindings: boolean;
}

export interface PathKpi {
  total: number;
  active: number;
  bySeverity: Record<SeverityLevel, number>;
}

export interface Posture {
  assets: AssetKpi;
  findings: FindingKpi;
  /** null when the paths endpoint is unavailable. */
  paths: PathKpi | null;
  /** null when the remediations endpoint is unavailable. */
  remediations: Record<Outcome, number> | null;
  remediationTotal: number | null;
}

const emptyBySeverity = () => Object.fromEntries(SEVERITY_ORDER.map((s) => [s, 0])) as Record<SeverityLevel, number>;

const OUTCOMES: Outcome[] = [
  'awaiting-approval',
  'approved',
  'applied-unverified',
  'verified',
  'verification-failed',
  'failed',
  'rejected',
];

function graphAssetNodes(graph: SecurityGraph | null) {
  return (graph?.nodes ?? []).filter((n) => n.type !== 'FINDING');
}

/** `findingsCount` on an asset node's data, when it is a non-negative integer. Anything else is ignored. */
function nodeFindingsCount(data: Record<string, unknown> | undefined): number {
  const v = data?.findingsCount;
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 ? v : 0;
}

export function computePosture(input: PostureInput): Posture {
  const { assets, findings, paths, graph, remediations } = input;

  const graphAssets = graphAssetNodes(graph);
  const useGraphForAssets = assets.length === 0 && graphAssets.length > 0;
  const assetKpi: AssetKpi = {
    count: useGraphForAssets ? graphAssets.length : assets.length,
    source: useGraphForAssets ? 'graph' : 'inventory',
    inventoryEmptyButGraphHasAssets: useGraphForAssets,
  };

  const openBySeverity = emptyBySeverity();
  let openTotal = 0;
  for (const f of findings) {
    if (f.status === 'OPEN') {
      openBySeverity[f.severity] += 1;
      openTotal += 1;
    }
  }
  const graphFindings = graph ? graphAssets.reduce((sum, n) => sum + nodeFindingsCount(n.data), 0) : null;
  const findingKpi: FindingKpi = {
    openBySeverity,
    openTotal,
    total: findings.length,
    graphReportedCount: findings.length === 0 && graphFindings && graphFindings > 0 ? graphFindings : null,
    listEmptyButGraphReportsFindings: findings.length === 0 && !!graphFindings && graphFindings > 0,
  };

  let pathKpi: PathKpi | null = null;
  if (paths) {
    const bySeverity = emptyBySeverity();
    for (const p of paths) bySeverity[p.severity] += 1;
    pathKpi = { total: paths.length, active: paths.filter((p) => p.status === 'ACTIVE').length, bySeverity };
  }

  let remediationTally: Record<Outcome, number> | null = null;
  if (remediations) {
    remediationTally = Object.fromEntries(OUTCOMES.map((o) => [o, 0])) as Record<Outcome, number>;
    for (const r of remediations) remediationTally[outcomeOf(r)] += 1;
  }

  return {
    assets: assetKpi,
    findings: findingKpi,
    paths: pathKpi,
    remediations: remediationTally,
    remediationTotal: remediations ? remediations.length : null,
  };
}

/** Scanner readiness exactly as the backend reported it (string values only; anything else is dropped). */
export function readScanners(raw: Record<string, unknown> | undefined): { name: string; state: string }[] {
  if (!raw) return [];
  return Object.entries(raw)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([name, state]) => ({ name, state }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Plain-language reading of a scanner state. Only "ready" is positive; everything else is shown as reported. */
export function scannerTone(state: string): 'ok' | 'neutral' | 'warn' {
  if (state === 'ready') return 'ok';
  if (state === 'unverified' || state === 'optional-unconfigured' || state === 'configured') return 'neutral';
  return 'warn';
}
