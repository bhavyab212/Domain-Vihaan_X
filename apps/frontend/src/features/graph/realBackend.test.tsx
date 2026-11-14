import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HEALTHY, json, renderApp, stubFetch } from '@/test/utils';
import { REAL_ATTACK_PATHS, REAL_GRAPH, REAL_GRAPH_WITH_FINDINGS } from '@/test/realBackend';
import { buildFlowNodes, pathHighlight, type AssetFlowNode, type FindingFlowNode } from './model';

/** Serve EXACTLY what Dev A's real backend returned, including the empty /assets and /findings. */
function serveReal(opts: { withFindings?: boolean } = {}) {
  return stubFetch((url) => {
    if (url.endsWith('/health')) return json(HEALTHY);
    if (url.includes('/graph')) return json(opts.withFindings ? REAL_GRAPH_WITH_FINDINGS : REAL_GRAPH);
    if (url.includes('/attack-paths')) return json(REAL_ATTACK_PATHS);
    if (url.endsWith('/assets')) return json([]); // real: the inventory endpoint is still a placeholder
    if (url.includes('/findings')) return json([]); // real: placeholder
    return json([]);
  });
}

describe('contract: the real backend payloads', () => {
  it('the captures are what we think they are', () => {
    expect(REAL_GRAPH.nodes.map((n) => n.id).sort()).toEqual(['asset-cloud-01', 'asset-repo-01', 'asset-storage-01']);
    expect(REAL_GRAPH.nodes.every((n) => n.type === 'ASSET')).toBe(true); // never IDENTITY / EXPLOIT_TARGET
    expect(REAL_GRAPH_WITH_FINDINGS.nodes.filter((n) => n.type === 'FINDING')).toHaveLength(2);
    expect(REAL_ATTACK_PATHS).toHaveLength(1);
  });

  it('asset facts live under node.data.type (NOT assetType)', () => {
    const data = REAL_GRAPH.nodes[0].data as Record<string, unknown>;
    expect(data.type).toBeDefined();
    expect(data.assetType).toBeUndefined();
  });

  it('the final path step has a null findingId and the timestamps carry no timezone', () => {
    const last = REAL_ATTACK_PATHS[0].steps.at(-1)!;
    expect(last.findingId).toBeNull();
    expect(REAL_ATTACK_PATHS[0].createdAt).not.toMatch(/Z|[+-]\d\d:?\d\d$/);
  });
});

describe('graph model against the REAL backend payload with an EMPTY inventory', () => {
  const nodes = () => buildFlowNodes(REAL_GRAPH_WITH_FINDINGS, [], [], 'BACKEND_API');

  it('still shows asset type, environment, criticality and owner (from node.data)', () => {
    const repo = nodes().find((n) => n.id === 'asset-repo-01') as AssetFlowNode;
    expect(repo.data).toMatchObject({
      typeLabel: 'Repository',
      assetType: 'REPOSITORY',
      environment: 'PRODUCTION',
      criticality: 'CRITICAL',
      owner: 'Engineering Team',
    });
    const cloud = nodes().find((n) => n.id === 'asset-cloud-01') as AssetFlowNode;
    expect(cloud.data).toMatchObject({ typeLabel: 'Cloud account', owner: 'DevOps Team' });
  });

  it('shows the metadata line from node.data.metadata (branch / provider / arn)', () => {
    expect((nodes().find((n) => n.id === 'asset-repo-01') as AssetFlowNode).data.metaLine).toBe('branch main');
    expect((nodes().find((n) => n.id === 'asset-cloud-01') as AssetFlowNode).data.metaLine).toBe('AWS');
  });

  it('finding cards get scanner from node.data even though /findings is empty, and invent no provenance', () => {
    const f = nodes().find((n) => n.id === 'find-sec-01') as FindingFlowNode;
    expect(f.data.scanner).toBe('gitleaks');
    expect(f.data.severity).toBe('CRITICAL');
    expect(f.data.provenance).toBeUndefined(); // the graph node does not carry provenance, so none is shown
  });

  it('names the associated asset from the finding node data.assetId when the inventory is empty', () => {
    const f = nodes().find((n) => n.id === 'find-sec-01') as FindingFlowNode;
    expect(f.data.assetName).toBe('saas-core-api'); // resolved from the graph's own asset node label
  });

  it('the inventory record, when present, wins over node.data', () => {
    const [bare] = buildFlowNodes(
      { updatedAt: 't', nodes: [{ id: 'x', label: 'x', type: 'ASSET', data: { type: 'DOMAIN', environment: 'STAGING', owner: 'from-node' } }], edges: [] },
      [{ id: 'x', name: 'x', type: 'REPOSITORY', environment: 'PRODUCTION', criticality: 'HIGH', owner: 'from-inventory', createdAt: 't', updatedAt: 't' }],
      [],
      'BACKEND_API',
    ) as AssetFlowNode[];
    expect(bare.data).toMatchObject({ assetType: 'REPOSITORY', environment: 'PRODUCTION', owner: 'from-inventory' });
  });

  it('ignores junk in node.data instead of trusting it', () => {
    const [bare] = buildFlowNodes(
      { updatedAt: 't', nodes: [{ id: 'x', label: 'x', type: 'ASSET', data: { type: 'NOT_A_TYPE', environment: 42, criticality: 'MEGA', owner: { a: 1 }, metadata: 'oops' } }], edges: [] },
      [],
      [],
      'BACKEND_API',
    ) as AssetFlowNode[];
    expect(bare.data.assetType).toBeUndefined();
    expect(bare.data.environment).toBeUndefined();
    expect(bare.data.criticality).toBeUndefined();
    expect(bare.data.owner).toBeUndefined();
    expect(bare.data.metaLine).toBeUndefined();
  });

  it('highlights the real path using its ids even though the last step has a null findingId', () => {
    const h = pathHighlight(REAL_GRAPH_WITH_FINDINGS, REAL_ATTACK_PATHS[0]);
    expect([...h.nodes].sort()).toEqual(['asset-cloud-01', 'asset-repo-01', 'asset-storage-01', 'find-iac-01', 'find-sec-01']);
    expect([...h.edges].sort()).toEqual(['rel-01', 'rel-02']);
    expect(h.nodes.has('null')).toBe(false);
  });
});

describe('/graph in API mode against the REAL payload', () => {
  it('renders the asset cards with real facts although /assets is empty', async () => {
    serveReal();
    renderApp('/graph', 'api');
    const canvas = await screen.findByTestId('graph-canvas');
    await waitFor(() => expect(canvas.querySelectorAll('.react-flow__node')).toHaveLength(3));
    const repo = within(canvas.querySelector('.react-flow__node[data-id="asset-repo-01"]') as HTMLElement);
    expect(repo.getByText('Repository')).toBeInTheDocument();
    expect(repo.getByText('Production')).toBeInTheDocument();
    expect(repo.getByText('Owner: Engineering Team')).toBeInTheDocument();
    expect(repo.queryByText('Simulated demo data')).not.toBeInTheDocument(); // backend data is not "preview"
  });

  it('with finding nodes: 5 nodes, 4 edges, 2 inferred and 2 recorded', async () => {
    serveReal({ withFindings: true });
    renderApp('/graph', 'api');
    const canvas = await screen.findByTestId('graph-canvas');
    await waitFor(() => expect(canvas.querySelectorAll('.react-flow__node')).toHaveLength(5));
    await waitFor(() => expect(canvas.querySelectorAll('[data-testid="edge-label"]')).toHaveLength(4));
    expect(canvas.querySelectorAll('[data-testid="edge-label"][data-inferred="true"]')).toHaveLength(2);
  });

  it('the inspector shows real asset and finding facts although /assets and /findings are empty', async () => {
    serveReal({ withFindings: true });
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderApp('/graph', 'api');
    await user.click(await screen.findByRole('button', { name: /Repository: saas-core-api/ }));
    let inspector = await screen.findByTestId('node-inspector');
    expect(inspector).toHaveTextContent('Repository');
    expect(inspector).toHaveTextContent('Production');
    expect(inspector).toHaveTextContent('Critical');
    expect(inspector).toHaveTextContent('Engineering Team');
    expect(inspector).toHaveTextContent('branch main');

    await user.click(screen.getByRole('button', { name: /Finding: Committed AWS IAM Secret Key/ }));
    inspector = await screen.findByTestId('node-inspector');
    expect(inspector).toHaveTextContent('gitleaks');
    expect(inspector).toHaveTextContent('9.8'); // cvssScore from node.data
    expect(inspector).toHaveTextContent('Open');
    expect(inspector).not.toHaveTextContent('CVE'); // null in the payload, so no CVE row is invented
    expect(screen.getByRole('link', { name: /Open in Threats/ })).toHaveAttribute('href', '/threats?f=find-sec-01');
  });

  it('highlights the real path on request and the notice names it as not a confirmed exploit', async () => {
    serveReal({ withFindings: true });
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderApp('/graph', 'api');
    await user.click(await screen.findByRole('button', { name: /Highlight potential path/ }));
    expect(await screen.findByText(/Potential path, not a confirmed exploit/)).toBeInTheDocument();
    // the REAL path says isSimulated: true, so it may be described as simulated
    expect(screen.getByText(/in a simulated scenario/)).toBeInTheDocument();
  });
});
