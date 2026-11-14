import { describe, expect, it } from 'vitest';
import { PREVIEW_ASSETS, PREVIEW_ATTACK_PATHS, PREVIEW_FINDINGS, PREVIEW_GRAPH, PREVIEW_REMEDIATIONS } from '@/mocks/fixtures';
import { REAL_ATTACK_PATHS, REAL_GRAPH, REAL_GRAPH_WITH_FINDINGS } from '@/test/realBackend';
import type { AttackPath } from '@/types';
import { buildPathModel, orderPaths, parsePathParam, type PathContext } from './pathModel';

const preview: PathContext = { assets: PREVIEW_ASSETS, findings: PREVIEW_FINDINGS, graph: PREVIEW_GRAPH, remediations: PREVIEW_REMEDIATIONS };
const real: PathContext = { assets: [], findings: [], graph: REAL_GRAPH_WITH_FINDINGS, remediations: [] };

describe('buildPathModel with the preview fixtures', () => {
  const model = buildPathModel(PREVIEW_ATTACK_PATHS[0], preview);

  it('orders hops by step number and assigns entry / intermediate / target roles', () => {
    expect(model.hops.map((h) => h.stepNumber)).toEqual([1, 2, 3]);
    expect(model.hops.map((h) => h.role)).toEqual(['entry', 'intermediate', 'target']);
  });

  it('sorts steps even when the backend sends them out of order', () => {
    const shuffled: AttackPath = { ...PREVIEW_ATTACK_PATHS[0], steps: [...PREVIEW_ATTACK_PATHS[0].steps].reverse() };
    expect(buildPathModel(shuffled, preview).hops.map((h) => h.stepNumber)).toEqual([1, 2, 3]);
  });

  it('resolves assets from the inventory and findings from the findings list (openable)', () => {
    expect(model.hops[0].asset).toMatchObject({ id: 'asset-repo-01', name: 'saas-core-api', source: 'inventory', type: 'REPOSITORY' });
    expect(model.hops[0].finding).toMatchObject({ id: 'find-sec-01', source: 'findings', severity: 'CRITICAL', provenance: 'SIMULATED_DEMO', openable: true });
  });

  it('passes technique and MITRE tactic through exactly as supplied', () => {
    expect(model.hops[0].technique).toBe(PREVIEW_ATTACK_PATHS[0].steps[0].technique);
    expect(model.hops[0].mitreTactic).toBe(PREVIEW_ATTACK_PATHS[0].steps[0].mitreTactic);
  });

  it('reports the relationship arriving at each step from the graph, none on the entry step', () => {
    expect(model.hops[0].relationship).toBeUndefined();
    expect(model.hops[1].relationship).toMatchObject({ edgeId: 'rel-01', relationship: 'STORES_CREDENTIAL_FOR', inferred: true, confidence: 0.98 });
    expect(model.hops[2].relationship).toMatchObject({ edgeId: 'rel-02', inferred: true });
  });

  it('marks the choke point only where the path supplied one', () => {
    expect(model.hops.filter((h) => h.isChokePoint).map((h) => h.asset.id)).toEqual(['asset-cloud-01']);
    expect(model.chokePoint?.name).toBe('aws-production-account');
  });

  it('collects distinct supporting findings and the exact graph ids to highlight', () => {
    expect(model.findings.map((f) => f.id)).toEqual(['find-sec-01', 'find-iac-01']);
    expect([...model.graphNodeIds].sort()).toEqual(['asset-cloud-01', 'asset-repo-01', 'asset-storage-01', 'find-iac-01', 'find-sec-01']);
  });

  it('links remediations the backend tied to the path or its findings', () => {
    expect(model.remediations.length).toBeGreaterThan(0);
    for (const r of model.remediations) {
      expect(r.attackPathId === 'path-01' || ['find-sec-01', 'find-iac-01'].includes(r.findingId)).toBe(true);
    }
  });
});

describe('buildPathModel with the REAL backend payload (empty inventory and findings list)', () => {
  const model = buildPathModel(REAL_ATTACK_PATHS[0], real);

  it('resolves assets from the graph and says that is where they came from', () => {
    expect(model.hops.map((h) => h.asset.source)).toEqual(['graph', 'graph', 'graph']);
    expect(model.hops[0].asset).toMatchObject({ name: 'saas-core-api', type: 'REPOSITORY', owner: 'Engineering Team', environment: 'PRODUCTION' });
  });

  it('resolves graph-only findings with NO invented provenance and not openable in /threats', () => {
    const f = model.hops[0].finding!;
    expect(f).toMatchObject({ id: 'find-sec-01', source: 'graph', severity: 'CRITICAL', scanner: 'gitleaks', openable: false });
    expect(f.provenance).toBeUndefined();
  });

  it('treats the final step null findingId as "no finding", not as the string "null"', () => {
    expect(model.hops[2].finding).toBeUndefined();
    expect(model.graphNodeIds).not.toContain('null');
    expect(model.findings.map((x) => x.id)).toEqual(['find-sec-01', 'find-iac-01']);
  });

  it('falls back to the id alone when neither inventory nor graph knows the asset or finding', () => {
    const bare = buildPathModel(REAL_ATTACK_PATHS[0], { assets: [], findings: [], graph: null, remediations: null });
    expect(bare.hops[0].asset).toEqual({ id: 'asset-repo-01', name: 'asset-repo-01', source: 'id-only' });
    expect(bare.hops[0].finding).toEqual({ id: 'find-sec-01', source: 'id-only', openable: false });
    expect(bare.hops.every((h) => h.relationship === undefined)).toBe(true);
    expect(bare.remediations).toEqual([]);
  });

  it('reports no choke point when the backend supplies none (the real path has none)', () => {
    expect(REAL_ATTACK_PATHS[0].chokePointAssetId).toBeUndefined();
    expect(model.chokePoint).toBeUndefined();
    expect(model.hops.some((h) => h.isChokePoint)).toBe(false);
  });

  it('does not treat a graph asset node as a finding, or a finding node as an asset', () => {
    const asFinding = buildPathModel({ ...REAL_ATTACK_PATHS[0], steps: [{ ...REAL_ATTACK_PATHS[0].steps[0], findingId: 'asset-repo-01' }] }, real);
    expect(asFinding.hops[0].finding).toEqual({ id: 'asset-repo-01', source: 'id-only', openable: false });
    const asAsset = buildPathModel({ ...REAL_ATTACK_PATHS[0], steps: [{ ...REAL_ATTACK_PATHS[0].steps[0], assetId: 'find-sec-01' }] }, real);
    expect(asAsset.hops[0].asset.source).toBe('id-only');
  });

  it('works with the finding-less graph too (default include_findings=false)', () => {
    const m = buildPathModel(REAL_ATTACK_PATHS[0], { ...real, graph: REAL_GRAPH });
    expect(m.hops[0].asset.name).toBe('saas-core-api');
    expect(m.hops[0].finding).toMatchObject({ id: 'find-sec-01', source: 'id-only' });
  });
});

describe('relationship lookup', () => {
  it('uses the edge in the direction of the path, preferring it over a reverse edge', () => {
    const graph = {
      updatedAt: 't',
      nodes: REAL_GRAPH.nodes,
      edges: [
        { id: 'back', source: 'asset-cloud-01', target: 'asset-repo-01', relationship: 'EXPOSES' as const, inferred: false },
        { id: 'fwd', source: 'asset-repo-01', target: 'asset-cloud-01', relationship: 'STORES_CREDENTIAL_FOR' as const, inferred: true, confidence: 0.5 },
      ],
    };
    const m = buildPathModel(REAL_ATTACK_PATHS[0], { ...real, graph });
    expect(m.hops[1].relationship?.edgeId).toBe('fwd');
  });

  it('omits confidence when the edge has none', () => {
    const graph = { updatedAt: 't', nodes: REAL_GRAPH.nodes, edges: [{ id: 'e', source: 'asset-repo-01', target: 'asset-cloud-01', relationship: 'EXPOSES' as const, inferred: false }] };
    expect(buildPathModel(REAL_ATTACK_PATHS[0], { ...real, graph }).hops[1].relationship?.confidence).toBeUndefined();
  });
});

describe('orderPaths only sorts, never scores', () => {
  const p = (id: string, severity: AttackPath['severity'], status: AttackPath['status'], createdAt = '2026-11-14T00:00:00') =>
    ({ ...REAL_ATTACK_PATHS[0], id, severity, status, createdAt }) as AttackPath;

  it('puts open before mitigated, then by severity, then newest first, then by id', () => {
    const ordered = orderPaths([
      p('mit-crit', 'CRITICAL', 'MITIGATED'),
      p('open-low', 'LOW', 'ACTIVE'),
      p('open-high-old', 'HIGH', 'ACTIVE', '2026-11-01T00:00:00'),
      p('open-high-new', 'HIGH', 'ACTIVE', '2026-11-10T00:00:00'),
      p('open-crit', 'CRITICAL', 'ACTIVE'),
    ]);
    expect(ordered.map((x) => x.id)).toEqual(['open-crit', 'open-high-new', 'open-high-old', 'open-low', 'mit-crit']);
  });

  it('is stable regardless of input order and does not mutate its input', () => {
    const input = [p('b', 'HIGH', 'ACTIVE'), p('a', 'HIGH', 'ACTIVE')];
    const copy = structuredClone(input);
    expect(orderPaths(input).map((x) => x.id)).toEqual(['a', 'b']);
    expect(orderPaths([...input].reverse()).map((x) => x.id)).toEqual(['a', 'b']);
    expect(input).toEqual(copy);
  });
});

describe('parsePathParam', () => {
  it('trims, bounds and rejects junk', () => {
    expect(parsePathParam(' path-01 ')).toBe('path-01');
    expect(parsePathParam('')).toBeNull();
    expect(parsePathParam('   ')).toBeNull();
    expect(parsePathParam(null)).toBeNull();
    expect(parsePathParam('x'.repeat(201))).toBeNull();
    expect(parsePathParam('x'.repeat(200))).toHaveLength(200);
  });
});
