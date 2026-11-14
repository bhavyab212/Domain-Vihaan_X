import { describe, expect, it } from 'vitest';
import { PREVIEW_ASSETS, PREVIEW_ATTACK_PATHS, PREVIEW_FINDINGS, PREVIEW_GRAPH, PREVIEW_REMEDIATIONS } from '@/mocks/fixtures';
import { REAL_ATTACK_PATHS, REAL_GRAPH } from '@/test/realBackend';
import type { RemediationAction, SecurityFinding } from '@/types';
import { computePosture, readScanners, scannerTone, type PostureInput } from './posture';

const input = (patch: Partial<PostureInput> = {}): PostureInput => ({
  assets: PREVIEW_ASSETS,
  findings: PREVIEW_FINDINGS,
  paths: PREVIEW_ATTACK_PATHS,
  graph: PREVIEW_GRAPH,
  remediations: PREVIEW_REMEDIATIONS,
  ...patch,
});
const finding = (id: string, severity: SecurityFinding['severity'], status: SecurityFinding['status'] = 'OPEN'): SecurityFinding => ({
  id, title: id, description: '', severity, scanner: 'trivy', assetId: 'a', provenance: 'OBSERVED', status, discoveredAt: '2026-11-14T10:00:00Z',
});
const rem = (id: string, status: RemediationAction['status'], verificationStatus?: RemediationAction['verificationStatus']): RemediationAction => ({
  id, findingId: 'f', title: id, description: '', requiresApproval: true, status, verificationStatus, createdAt: 't',
});

describe('computePosture: counts are tallies, never scores', () => {
  it('has no score, velocity or trend field at all', () => {
    const keys = Object.keys(computePosture(input())).join(',');
    expect(keys).not.toMatch(/score|risk|velocity|trend|posture/i);
  });

  it('tallies the preview fixtures exactly', () => {
    const p = computePosture(input());
    expect(p.assets).toEqual({ count: 3, source: 'inventory', inventoryEmptyButGraphHasAssets: false });
    expect(p.findings.openBySeverity).toMatchObject({ CRITICAL: 1, HIGH: 1, MEDIUM: 0, LOW: 0, INFORMATIONAL: 0 });
    expect(p.findings.openTotal).toBe(2);
    expect(p.paths).toMatchObject({ total: 1, active: 1 });
    expect(p.paths?.bySeverity.CRITICAL).toBe(1);
    expect(p.remediations?.['awaiting-approval']).toBe(2);
    expect(p.remediationTotal).toBe(2);
  });

  it('counts only OPEN findings in the severity breakdown but all in the total', () => {
    const p = computePosture(input({ findings: [finding('a', 'HIGH'), finding('b', 'HIGH', 'RESOLVED'), finding('c', 'LOW', 'ACCEPTED_RISK')] }));
    expect(p.findings.openBySeverity.HIGH).toBe(1);
    expect(p.findings.openBySeverity.LOW).toBe(0);
    expect(p.findings.openTotal).toBe(1);
    expect(p.findings.total).toBe(3);
  });

  it('keeps "unavailable" (null) distinct from "zero"', () => {
    const unavailable = computePosture(input({ paths: null, remediations: null }));
    expect(unavailable.paths).toBeNull();
    expect(unavailable.remediations).toBeNull();
    expect(unavailable.remediationTotal).toBeNull();
    const zero = computePosture(input({ paths: [], remediations: [] }));
    expect(zero.paths).toMatchObject({ total: 0, active: 0 });
    expect(zero.remediationTotal).toBe(0);
  });

  it('counts a path as active only when its status is ACTIVE', () => {
    const p = computePosture(input({ paths: [PREVIEW_ATTACK_PATHS[0], { ...PREVIEW_ATTACK_PATHS[0], id: 'p2', status: 'MITIGATED' }] }));
    expect(p.paths).toMatchObject({ total: 2, active: 1 });
  });

  it('tallies remediation lifecycle states and never counts an unverified one as verified', () => {
    const p = computePosture(input({
      remediations: [rem('a', 'PENDING'), rem('b', 'APPROVED', 'PASSED'), rem('c', 'APPLIED', 'UNVERIFIED'), rem('d', 'APPLIED', 'PASSED'), rem('e', 'APPLIED', 'FAILED'), rem('f', 'FAILED'), rem('g', 'REJECTED')],
    }));
    expect(p.remediations).toEqual({
      'awaiting-approval': 1, approved: 1, 'applied-unverified': 1, verified: 1, 'verification-failed': 1, failed: 1, rejected: 1,
    });
  });

  it('does not mutate its input', () => {
    const i = input();
    const copy = structuredClone(i);
    computePosture(i);
    expect(i).toEqual(copy);
  });
});

describe('computePosture against the REAL backend (empty inventory, populated graph)', () => {
  const real = () => computePosture({ assets: [], findings: [], paths: REAL_ATTACK_PATHS, graph: REAL_GRAPH, remediations: [] });

  it('counts the assets from the graph and says that is where they came from', () => {
    expect(real().assets).toEqual({ count: 3, source: 'graph', inventoryEmptyButGraphHasAssets: true });
  });

  it('reports the findings the graph says exist, without inventing a severity breakdown', () => {
    const f = real().findings;
    expect(f.listEmptyButGraphReportsFindings).toBe(true);
    expect(f.graphReportedCount).toBe(2);
    expect(f.openTotal).toBe(0); // the LIST is empty; the breakdown stays zero rather than guessed
    expect(Object.values(f.openBySeverity).every((n) => n === 0)).toBe(true);
  });

  it('counts the real attack path', () => {
    expect(real().paths).toMatchObject({ total: 1, active: 1 });
  });

  it('ignores a malformed findingsCount instead of trusting it', () => {
    const graph = { ...REAL_GRAPH, nodes: REAL_GRAPH.nodes.map((n) => ({ ...n, data: { ...n.data, findingsCount: -3 } })) };
    const p = computePosture({ assets: [], findings: [], paths: [], graph, remediations: [] });
    expect(p.findings.graphReportedCount).toBeNull();
    const text = { ...REAL_GRAPH, nodes: REAL_GRAPH.nodes.map((n) => ({ ...n, data: { ...n.data, findingsCount: '9' } })) };
    expect(computePosture({ assets: [], findings: [], paths: [], graph: text, remediations: [] }).findings.graphReportedCount).toBeNull();
  });

  it('prefers the inventory once it has records', () => {
    expect(computePosture({ assets: PREVIEW_ASSETS.slice(0, 1), findings: [], paths: [], graph: REAL_GRAPH, remediations: [] }).assets).toEqual({
      count: 1, source: 'inventory', inventoryEmptyButGraphHasAssets: false,
    });
  });

  it('never counts finding nodes as assets', () => {
    const g = { ...REAL_GRAPH, nodes: [...REAL_GRAPH.nodes, { id: 'f1', label: 'f', type: 'FINDING' as const }] };
    expect(computePosture({ assets: [], findings: [], paths: [], graph: g, remediations: [] }).assets.count).toBe(3);
  });
});

describe('scanner readiness is shown exactly as reported', () => {
  const real = { gitleaks: 'unverified', checkov: 'unverified', trivy: 'ready', subfinder: 'unverified', hexstrike: 'optional-unconfigured' };

  it('keeps only string states, sorted, and drops anything else', () => {
    expect(readScanners({ ...real, junk: 42, nested: { a: 1 }, nil: null })).toEqual([
      { name: 'checkov', state: 'unverified' },
      { name: 'gitleaks', state: 'unverified' },
      { name: 'hexstrike', state: 'optional-unconfigured' },
      { name: 'subfinder', state: 'unverified' },
      { name: 'trivy', state: 'ready' },
    ]);
    expect(readScanners(undefined)).toEqual([]);
  });

  it('only "ready" is positive; unverified is never presented as healthy', () => {
    expect(scannerTone('ready')).toBe('ok');
    expect(scannerTone('unverified')).toBe('neutral');
    expect(scannerTone('optional-unconfigured')).toBe('neutral');
    expect(scannerTone('error')).toBe('warn');
    expect(scannerTone('missing')).toBe('warn');
  });
});
