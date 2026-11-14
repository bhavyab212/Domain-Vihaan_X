import { describe, expect, it } from 'vitest';
import { PREVIEW_ASSETS, PREVIEW_ATTACK_PATHS, PREVIEW_FINDINGS, PREVIEW_GRAPH } from '@/mocks/fixtures';
import type { SecurityGraph } from '@/types';
import { layoutGraph, NODE_H, NODE_W } from './layout';
import {
  buildFlowEdges,
  buildFlowNodes,
  describeGraph,
  edgeHandles,
  NO_HIGHLIGHT,
  pathHighlight,
  styleNodes,
  type AssetFlowNode,
  type FindingFlowNode,
  type GraphView,
} from './model';

const nodes = () => buildFlowNodes(PREVIEW_GRAPH, PREVIEW_ASSETS, PREVIEW_FINDINGS, 'SIMULATED_DEMO');
const view = (patch: Partial<GraphView> = {}): GraphView => ({
  selectedId: null,
  highlight: NO_HIGHLIGHT,
  reducedMotion: false,
  ...patch,
});
const highlight = () => pathHighlight(PREVIEW_GRAPH, PREVIEW_ATTACK_PATHS[0]);

describe('layout (deterministic, no overlap)', () => {
  it('returns identical positions for identical input', () => {
    const a = layoutGraph(PREVIEW_GRAPH).nodes.map((n) => [n.node.id, n.x, n.y]);
    const b = layoutGraph(structuredClone(PREVIEW_GRAPH)).nodes.map((n) => [n.node.id, n.x, n.y]);
    expect(a).toEqual(b);
  });

  it('places every node exactly once', () => {
    const ids = layoutGraph(PREVIEW_GRAPH).nodes.map((n) => n.node.id);
    expect(ids.sort()).toEqual(PREVIEW_GRAPH.nodes.map((n) => n.id).sort());
  });

  it('never lets two node boxes overlap', () => {
    const placed = layoutGraph(PREVIEW_GRAPH).nodes;
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        const overlap = a.x < b.x + NODE_W && b.x < a.x + NODE_W && a.y < b.y + NODE_H && b.y < a.y + NODE_H;
        expect(overlap, `${a.node.id} overlaps ${b.node.id}`).toBe(false);
      }
    }
  });

  it('flows left to right along the documented chain and hangs findings below their asset', () => {
    const { byId } = layoutGraph(PREVIEW_GRAPH);
    expect(byId['asset-repo-01'].x).toBeLessThan(byId['asset-cloud-01'].x);
    expect(byId['asset-cloud-01'].x).toBeLessThan(byId['asset-storage-01'].x);
    expect(byId['find-sec-01'].x).toBe(byId['asset-repo-01'].x);
    expect(byId['find-sec-01'].y).toBeGreaterThan(byId['asset-repo-01'].y);
  });

  it('terminates on a cyclic graph and on an empty graph', () => {
    const cyclic: SecurityGraph = {
      updatedAt: 't',
      nodes: [
        { id: 'a', label: 'a', type: 'ASSET' },
        { id: 'b', label: 'b', type: 'ASSET' },
      ],
      edges: [
        { id: 'e1', source: 'a', target: 'b', relationship: 'DEPENDS_ON', inferred: false },
        { id: 'e2', source: 'b', target: 'a', relationship: 'DEPENDS_ON', inferred: false },
      ],
    };
    expect(layoutGraph(cyclic).nodes).toHaveLength(2);
    expect(layoutGraph({ nodes: [], edges: [], updatedAt: 't' }).nodes).toHaveLength(0);
  });
});

describe('flow nodes', () => {
  it('builds one node per graph node with the right custom type', () => {
    const built = nodes();
    expect(built).toHaveLength(PREVIEW_GRAPH.nodes.length);
    expect(built.filter((n) => n.type === 'finding')).toHaveLength(2);
    expect(built.filter((n) => n.type === 'asset')).toHaveLength(3);
  });

  it('uses stable ids and a stable structure across rebuilds', () => {
    expect(nodes().map((n) => n.id)).toEqual(nodes().map((n) => n.id));
  });

  it('classifies asset cards by the real asset type, not by guesswork', () => {
    const byId = Object.fromEntries(nodes().map((n) => [n.id, n]));
    expect((byId['asset-repo-01'] as AssetFlowNode).data.typeLabel).toBe('Repository');
    expect((byId['asset-repo-01'] as AssetFlowNode).data.assetType).toBe('REPOSITORY');
    expect((byId['asset-cloud-01'] as AssetFlowNode).data.typeLabel).toBe('Identity');
    expect((byId['asset-storage-01'] as AssetFlowNode).data.typeLabel).toBe('Target');
  });

  it('carries environment, criticality and one real metadata line from the asset', () => {
    const repo = nodes().find((n) => n.id === 'asset-repo-01') as AssetFlowNode;
    expect(repo.data.environment).toBe('PRODUCTION');
    expect(repo.data.criticality).toBe('CRITICAL');
    expect(repo.data.metaLine).toBe('branch main');
    const cloud = nodes().find((n) => n.id === 'asset-cloud-01') as AssetFlowNode;
    expect(cloud.data.metaLine).toBe('AWS');
  });

  it('omits metadata it does not have instead of inventing it', () => {
    const [bare] = buildFlowNodes(
      { updatedAt: 't', nodes: [{ id: 'x', label: 'x', type: 'ASSET' }], edges: [] },
      [],
      [],
      'BACKEND_API',
    ) as AssetFlowNode[];
    expect(bare.data.environment).toBeUndefined();
    expect(bare.data.criticality).toBeUndefined();
    expect(bare.data.metaLine).toBeUndefined();
    expect(bare.data.simulated).toBe(false);
  });

  it('marks assets simulated only for the local preview source', () => {
    expect((nodes().find((n) => n.id === 'asset-repo-01') as AssetFlowNode).data.simulated).toBe(true);
    const live = buildFlowNodes(PREVIEW_GRAPH, PREVIEW_ASSETS, PREVIEW_FINDINGS, 'BACKEND_API');
    expect((live.find((n) => n.id === 'asset-repo-01') as AssetFlowNode).data.simulated).toBe(false);
  });

  it('gives finding cards severity, scanner, provenance and the associated asset name', () => {
    const f = nodes().find((n) => n.id === 'find-sec-01') as FindingFlowNode;
    expect(f.data).toMatchObject({
      severity: 'CRITICAL',
      scanner: 'gitleaks',
      provenance: 'SIMULATED_DEMO',
      assetName: 'saas-core-api',
    });
  });

  it('never puts secrets or evidence text on a card', () => {
    const blob = JSON.stringify(nodes().map((n) => n.data));
    expect(blob).not.toMatch(/AKIA|wJalr|SECRET_ACCESS_KEY/);
  });

  it('describes every node for assistive technology', () => {
    for (const n of nodes()) expect(n.ariaLabel).toMatch(/\w+: .+/);
  });
});

describe('selection and path styling', () => {
  it('marks only the selected node selected', () => {
    const styled = styleNodes(nodes(), view({ selectedId: 'asset-repo-01' }));
    expect(styled.filter((n) => n.selected).map((n) => n.id)).toEqual(['asset-repo-01']);
  });

  it('dims everything off-path and flags on-path nodes when a path is highlighted', () => {
    const styled = styleNodes(nodes(), view({ highlight: highlight() }));
    for (const n of styled) {
      const expectedOnPath = highlight().nodes.has(n.id);
      expect(n.data.onPath).toBe(expectedOnPath);
      expect(n.data.dim).toBe(!expectedOnPath);
    }
  });

  it('dims nothing when no path is highlighted', () => {
    for (const n of styleNodes(nodes(), view())) expect(n.data.dim).toBe(false);
  });

  it('reuses unchanged node objects (no needless re-render)', () => {
    const base = nodes();
    const once = styleNodes(base, view({ selectedId: 'asset-repo-01' }));
    const twice = styleNodes(once, view({ selectedId: 'asset-repo-01' }));
    twice.forEach((n, i) => expect(n).toBe(once[i]));
  });

  it('preserves dragged positions when only the view state changes', () => {
    const moved = nodes().map((n) => (n.id === 'asset-repo-01' ? { ...n, position: { x: 999, y: 888 } } : n));
    const styled = styleNodes(moved, view({ selectedId: 'asset-cloud-01' }));
    expect(styled.find((n) => n.id === 'asset-repo-01')?.position).toEqual({ x: 999, y: 888 });
  });
});

describe('path highlight', () => {
  it('uses only ids the backend supplied: path assets, their findings, and the hops between them', () => {
    const h = highlight();
    expect([...h.nodes].sort()).toEqual(
      ['asset-cloud-01', 'asset-repo-01', 'asset-storage-01', 'find-iac-01', 'find-sec-01'].sort(),
    );
    expect([...h.edges].sort()).toEqual(['rel-01', 'rel-02']);
  });

  it('highlights nothing without a path', () => {
    expect(pathHighlight(PREVIEW_GRAPH, undefined)).toBe(NO_HIGHLIGHT);
  });

  it('never highlights finding-attachment edges', () => {
    expect(highlight().edges.has('edge-repo-finding')).toBe(false);
    expect(highlight().edges.has('edge-cloud-finding')).toBe(false);
  });
});

describe('flow edges', () => {
  const edges = (v: GraphView = view()) => buildFlowEdges(PREVIEW_GRAPH, nodes(), v);

  it('builds one edge per relationship', () => {
    expect(edges()).toHaveLength(PREVIEW_GRAPH.edges.length);
  });

  it('keeps inferred and verified relationships distinct, with confidence only where supplied', () => {
    const byId = Object.fromEntries(edges().map((e) => [e.id, e]));
    expect(byId['rel-01'].data?.inferred).toBe(true);
    expect(byId['rel-01'].data?.sublabel).toBe('inferred · 98%');
    expect(byId['rel-02'].data?.sublabel).toBe('inferred · 95%');
    expect(byId['edge-repo-finding'].data?.inferred).toBe(false);
    expect(byId['edge-repo-finding'].data?.sublabel).toBe('verified');
  });

  it('labels relationships in plain language', () => {
    expect(edges().find((e) => e.id === 'rel-01')?.data?.label).toBe('stores credential for');
  });

  it('animates ONLY on-path edges', () => {
    const animated = edges(view({ highlight: highlight() })).filter((e) => e.data?.animated);
    expect(animated.map((e) => e.id).sort()).toEqual(['rel-01', 'rel-02']);
  });

  it('animates nothing when no path is highlighted, even for inferred edges', () => {
    expect(edges().some((e) => e.data?.animated)).toBe(false);
  });

  it('never animates under reduced motion, but still marks the path', () => {
    const reduced = edges(view({ highlight: highlight(), reducedMotion: true }));
    expect(reduced.some((e) => e.data?.animated)).toBe(false);
    expect(reduced.filter((e) => e.data?.onPath).map((e) => e.id).sort()).toEqual(['rel-01', 'rel-02']);
  });

  it('dims edges off the highlighted path', () => {
    const e = edges(view({ highlight: highlight() }));
    expect(e.find((x) => x.id === 'edge-repo-finding')?.data?.dim).toBe(true);
    expect(e.find((x) => x.id === 'rel-01')?.data?.dim).toBe(false);
  });

  it('highlights edges connected to the selected node and dims the rest', () => {
    const e = edges(view({ selectedId: 'asset-cloud-01' }));
    const connected = e.filter((x) => x.data?.connected).map((x) => x.id).sort();
    expect(connected).toEqual(['edge-cloud-finding', 'rel-01', 'rel-02']);
    expect(e.find((x) => x.id === 'edge-repo-finding')?.data?.dim).toBe(true);
  });

  it('drops edges whose endpoints are missing instead of crashing', () => {
    const broken: SecurityGraph = {
      ...PREVIEW_GRAPH,
      edges: [...PREVIEW_GRAPH.edges, { id: 'ghost', source: 'nope', target: 'asset-repo-01', relationship: 'DEPENDS_ON', inferred: false }],
    };
    expect(buildFlowEdges(broken, nodes(), view()).some((e) => e.id === 'ghost')).toBe(false);
  });

  it('routes edges out of the facing sides', () => {
    expect(edgeHandles({ x: 0, y: 0 }, { x: 400, y: 0 })).toEqual({ sourceHandle: 'r', targetHandle: 'l' });
    expect(edgeHandles({ x: 400, y: 0 }, { x: 0, y: 0 })).toEqual({ sourceHandle: 'l', targetHandle: 'r' });
    expect(edgeHandles({ x: 0, y: 0 }, { x: 10, y: 300 })).toEqual({ sourceHandle: 'b', targetHandle: 't' });
    expect(edgeHandles({ x: 0, y: 300 }, { x: 10, y: 0 })).toEqual({ sourceHandle: 't', targetHandle: 'b' });
  });
});

describe('describeGraph', () => {
  it('summarises counts and inferred/verified split', () => {
    expect(describeGraph(PREVIEW_GRAPH)).toBe('5 nodes and 4 relationships, 2 inferred and 2 verified.');
    expect(describeGraph({ nodes: [], edges: [], updatedAt: 't' })).toBe('0 nodes and 0 relationships, 0 inferred and 0 verified.');
  });
});
