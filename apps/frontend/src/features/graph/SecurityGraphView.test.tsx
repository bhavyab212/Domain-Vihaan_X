import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PREVIEW_ASSETS, PREVIEW_ATTACK_PATHS, PREVIEW_FINDINGS, PREVIEW_GRAPH } from '@/mocks/fixtures';
import type { SecurityGraph } from '@/types';
import { HEALTHY, json, renderApp, stubFetch, stubOffline } from '@/test/utils';

const labels = (canvas: HTMLElement) => [...canvas.querySelectorAll<HTMLElement>('[data-testid="edge-label"]')];

/** Backend stub. `paths: null` makes /attack-paths a 404 (not implemented), as on today's integration branch. */
function serve(opts: { graph?: unknown; assets?: unknown; findings?: unknown; paths?: unknown | null; graphStatus?: number } = {}) {
  return stubFetch((url) => {
    if (url.endsWith('/health')) return json(HEALTHY);
    if (url.includes('/graph')) return opts.graphStatus ? json({}, opts.graphStatus) : json(opts.graph ?? PREVIEW_GRAPH);
    if (url.endsWith('/assets')) return json(opts.assets ?? PREVIEW_ASSETS);
    if (url.includes('/findings')) return json(opts.findings ?? PREVIEW_FINDINGS);
    if (url.includes('/attack-paths')) return opts.paths === null ? json({}, 404) : json(opts.paths ?? PREVIEW_ATTACK_PATHS);
    return json([]);
  });
}

describe('TSK-007: /graph in API mode', () => {
  it('renders the backend graph through the API client, with no preview banner', async () => {
    const fetchMock = serve();
    renderApp('/graph', 'api');
    const canvas = await screen.findByTestId('graph-canvas');
    await waitFor(() => expect(canvas.querySelectorAll('.react-flow__node')).toHaveLength(5));
    expect(screen.queryByTestId('preview-banner')).not.toBeInTheDocument();
    expect(screen.getByText('Backend data')).toBeInTheDocument();
    const urls = fetchMock.mock.calls.map(([u]) => String(u));
    expect(urls).toContain('http://localhost:8000/api/v1/graph');
  });

  it('shows ONLY what the backend returned, not the preview fixtures', async () => {
    const custom: SecurityGraph = {
      updatedAt: '2026-11-15T00:00:00Z',
      nodes: [
        { id: 'n1', label: 'Backend repo', type: 'ASSET', data: { assetType: 'REPOSITORY' } },
        { id: 'n2', label: 'Backend bucket', type: 'EXPLOIT_TARGET', data: { assetType: 'DATABASE' } },
      ],
      edges: [{ id: 'e1', source: 'n1', target: 'n2', relationship: 'GRANTS_ACCESS_TO', inferred: true, confidence: 0.42 }],
    };
    serve({ graph: custom, assets: [], findings: [] });
    renderApp('/graph', 'api');
    const canvas = await screen.findByTestId('graph-canvas');
    await waitFor(() => expect(canvas.querySelectorAll('.react-flow__node')).toHaveLength(2));
    expect(canvas).toHaveAttribute('data-node-count', '2');
    expect(within(canvas).getByText('Backend repo')).toBeInTheDocument();
    expect(screen.queryByText('saas-core-api')).not.toBeInTheDocument();
    await waitFor(() => expect(labels(canvas)).toHaveLength(1));
    expect(labels(canvas)[0]).toHaveTextContent('inferred · 42%'); // backend confidence preserved
  });

  it('does not mark backend nodes as simulated', async () => {
    serve();
    renderApp('/graph', 'api');
    const canvas = await screen.findByTestId('graph-canvas');
    await waitFor(() => expect(canvas.querySelectorAll('.react-flow__node')).toHaveLength(5));
    expect(within(canvas).queryByText('Simulated demo data')).not.toBeInTheDocument();
  });

  it('shows an error with retry and NO fixture graph when the graph request fails', async () => {
    serve({ graphStatus: 500 });
    renderApp('/graph', 'api');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Request failed');
    expect(within(alert).getByRole('button', { name: /Retry/ })).toBeInTheDocument();
    expect(screen.queryByTestId('graph-canvas')).not.toBeInTheDocument();
    expect(screen.queryByText('saas-core-api')).not.toBeInTheDocument();
  });

  it('shows the offline error (no fixtures) when the backend is unreachable', async () => {
    stubOffline();
    renderApp('/graph', 'api');
    expect(await screen.findByRole('alert')).toHaveTextContent('Backend unreachable');
    expect(screen.queryByTestId('graph-canvas')).not.toBeInTheDocument();
  });

  it('shows an intentional empty state for an empty backend graph', async () => {
    serve({ graph: { nodes: [], edges: [], updatedAt: 't' } });
    renderApp('/graph', 'api');
    expect(await screen.findByText('The graph is empty')).toBeInTheDocument();
    expect(screen.queryByTestId('graph-canvas')).not.toBeInTheDocument();
  });

  it('still renders the graph when /attack-paths is not implemented (404), without a path button', async () => {
    serve({ paths: null });
    renderApp('/graph', 'api');
    const canvas = await screen.findByTestId('graph-canvas');
    await waitFor(() => expect(canvas.querySelectorAll('.react-flow__node')).toHaveLength(5));
    expect(screen.queryByRole('button', { name: /Highlight potential path/ })).not.toBeInTheDocument();
  });

  it('highlights a backend-supplied path, and calls it not-a-confirmed-exploit', async () => {
    const user = userEvent.setup();
    serve({ paths: PREVIEW_ATTACK_PATHS.map((p) => ({ ...p, isSimulated: false })) });
    renderApp('/graph', 'api');
    const canvas = await screen.findByTestId('graph-canvas');
    await user.click(await screen.findByRole('button', { name: /Highlight potential path/ }));
    expect(await screen.findByText(/Potential path, not a confirmed exploit/)).toBeInTheDocument();
    await waitFor(() => expect(canvas.querySelectorAll('[data-testid="edge-label"][data-on-path="true"]')).toHaveLength(2));
    // a non-simulated path must not be described as simulated
    expect(screen.queryByText(/in a simulated scenario/)).not.toBeInTheDocument();
  });

  it('does not repeat requests in a loop (one request per endpoint on load)', async () => {
    const fetchMock = serve();
    renderApp('/graph', 'api');
    await screen.findByTestId('graph-canvas');
    // Let any (incorrect) refetch loop show itself. Wrapped in act so React Flow's async measurement
    // updates during the wait are not reported as out-of-act warnings.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 250));
    });
    const count = (needle: string) => fetchMock.mock.calls.filter(([u]) => String(u).includes(needle)).length;
    expect(count('/graph')).toBe(1);
    expect(count('/attack-paths')).toBe(1);
  });
});

describe('TSK-007: /graph in preview mode', () => {
  it('uses the fixtures, marks them simulated, and makes no graph request to the backend', async () => {
    const fetchMock = stubOffline();
    renderApp('/graph');
    const canvas = await screen.findByTestId('graph-canvas');
    await waitFor(() => expect(canvas.querySelectorAll('.react-flow__node')).toHaveLength(5));
    expect(screen.getByTestId('preview-banner')).toHaveTextContent('SIMULATED_DEMO');
    expect(within(canvas).getAllByText('Simulated demo data').length).toBeGreaterThan(0);
    const graphCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes('/graph'));
    expect(graphCalls).toHaveLength(0);
  });
});

describe('relationship selection and the two inspectors', () => {
  const edgeEl = (canvas: HTMLElement, id: string) => canvas.querySelector(`.react-flow__edge[data-id="${id}"]`) as SVGElement;

  it('clicking a relationship opens the relationship inspector with type, verified/inferred, confidence and endpoints', async () => {
    const user = userEvent.setup();
    stubOffline();
    renderApp('/graph');
    const canvas = await screen.findByTestId('graph-canvas');
    await waitFor(() => expect(canvas.querySelectorAll('.react-flow__edge')).toHaveLength(4));

    await user.click(edgeEl(canvas, 'rel-01'));
    const inspector = await screen.findByTestId('edge-inspector');
    expect(screen.getByText('Selected relationship')).toBeInTheDocument();
    expect(inspector).toHaveTextContent('stores credential for');
    expect(inspector).toHaveTextContent('Inferred');
    expect(inspector).toHaveTextContent('98%');
    expect(inspector).toHaveTextContent('saas-core-api');
    expect(inspector).toHaveTextContent('StagingDeployer (IAM role)');
    expect(inspector).toHaveTextContent('not a directly observed fact');
    await waitFor(() => expect(labels(canvas).filter((l) => l.getAttribute('data-selected') === 'true').map((l) => l.getAttribute('data-edge-id'))).toEqual(['rel-01']));
  });

  it('a verified relationship shows no confidence and says it is recorded', async () => {
    const user = userEvent.setup();
    stubOffline();
    renderApp('/graph');
    const canvas = await screen.findByTestId('graph-canvas');
    await waitFor(() => expect(canvas.querySelectorAll('.react-flow__edge')).toHaveLength(4));
    await user.click(edgeEl(canvas, 'edge-repo-finding'));
    const inspector = await screen.findByTestId('edge-inspector');
    expect(inspector).toHaveTextContent('Verified');
    expect(inspector).not.toHaveTextContent('Confidence');
    expect(inspector).toHaveTextContent('A recorded relationship');
  });

  it('selecting a node clears the relationship selection and vice versa', async () => {
    const user = userEvent.setup();
    stubOffline();
    renderApp('/graph');
    const canvas = await screen.findByTestId('graph-canvas');
    await waitFor(() => expect(canvas.querySelectorAll('.react-flow__edge')).toHaveLength(4));

    await user.click(edgeEl(canvas, 'rel-02'));
    expect(await screen.findByTestId('edge-inspector')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Repository: saas-core-api/ }));
    expect(await screen.findByTestId('node-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('edge-inspector')).not.toBeInTheDocument();

    await user.click(edgeEl(canvas, 'rel-02'));
    expect(await screen.findByTestId('edge-inspector')).toBeInTheDocument();
    expect(screen.queryByTestId('node-inspector')).not.toBeInTheDocument();
  });

  it('clicking the empty canvas clears the selection', async () => {
    const user = userEvent.setup();
    stubOffline();
    renderApp('/graph');
    const canvas = await screen.findByTestId('graph-canvas');
    await waitFor(() => expect(canvas.querySelectorAll('.react-flow__edge')).toHaveLength(4));
    await user.click(edgeEl(canvas, 'rel-01'));
    await screen.findByTestId('edge-inspector');
    await user.click(canvas.querySelector('.react-flow__pane') as HTMLElement);
    await waitFor(() => expect(screen.queryByTestId('edge-inspector')).not.toBeInTheDocument());
    expect(screen.getByText('Select a node')).toBeInTheDocument();
  });

  it('the relationship inspector links to its endpoints', async () => {
    const user = userEvent.setup();
    stubOffline();
    renderApp('/graph');
    const canvas = await screen.findByTestId('graph-canvas');
    await waitFor(() => expect(canvas.querySelectorAll('.react-flow__edge')).toHaveLength(4));
    await user.click(edgeEl(canvas, 'rel-01'));
    const inspector = await screen.findByTestId('edge-inspector');
    await user.click(within(inspector).getByRole('button', { name: 'StagingDeployer (IAM role)' }));
    expect(await screen.findByTestId('node-inspector')).toHaveTextContent('asset-cloud-01');
  });

  it('flags a path hop in the relationship inspector as not a confirmed exploit', async () => {
    const user = userEvent.setup();
    stubOffline();
    renderApp('/graph');
    const canvas = await screen.findByTestId('graph-canvas');
    await user.click(await screen.findByRole('button', { name: /Highlight potential path/ }));
    await waitFor(() => expect(canvas.querySelectorAll('.react-flow__edge')).toHaveLength(4));
    await user.click(edgeEl(canvas, 'rel-01'));
    const inspector = await screen.findByTestId('edge-inspector');
    expect(inspector).toHaveTextContent('On potential path');
    expect(inspector).toHaveTextContent('not a confirmed exploit');
  });

  it('node inspector links to the finding via a deep link', async () => {
    const user = userEvent.setup();
    stubOffline();
    renderApp('/graph');
    await user.click(await screen.findByRole('button', { name: /Finding: Leaked AWS secret key/ }));
    const link = await screen.findByRole('link', { name: /Open in Threats/ });
    expect(link).toHaveAttribute('href', '/threats?f=find-sec-01');
  });

  it('identity node inspector says Identity, not Asset', async () => {
    const user = userEvent.setup();
    stubOffline();
    renderApp('/graph');
    await user.click(await screen.findByRole('button', { name: /Identity: StagingDeployer/ }));
    expect(await screen.findByTestId('node-inspector')).toHaveTextContent('Identity');
  });
});
