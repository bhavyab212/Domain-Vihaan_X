import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PREVIEW_ASSETS, PREVIEW_ATTACK_PATHS, PREVIEW_FINDINGS, PREVIEW_GRAPH } from '@/mocks/fixtures';
import type { DataOrigin, SecurityGraph } from '@/types';
import { GraphCanvas } from './GraphCanvas';
import { NO_HIGHLIGHT, pathHighlight, type Highlight } from './model';

function mockReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (query: string) => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  );
}

interface HarnessProps {
  graph?: SecurityGraph;
  origin?: DataOrigin;
  highlight?: Highlight;
  onSelectSpy?: (id: string | null) => void;
}

/** Owns selection like SecurityGraphView does, so clicks round-trip through real state. */
function Harness({ graph = PREVIEW_GRAPH, origin = 'SIMULATED_DEMO', highlight = NO_HIGHLIGHT, onSelectSpy }: HarnessProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <GraphCanvas
      graph={graph}
      assets={PREVIEW_ASSETS}
      findings={PREVIEW_FINDINGS}
      selectedId={selectedId}
      onSelect={(id) => {
        onSelectSpy?.(id);
        setSelectedId(id);
      }}
      highlight={highlight}
      origin={origin}
    />
  );
}

const mount = async (props: HarnessProps = {}) => {
  const utils = render(<Harness {...props} />);
  const canvas = await screen.findByTestId('graph-canvas');
  await waitFor(() => expect(canvas.querySelectorAll('.react-flow__node').length).toBeGreaterThan(0));
  return { ...utils, canvas };
};

const nodeEl = (canvas: HTMLElement, id: string) => canvas.querySelector(`.react-flow__node[data-id="${id}"]`) as HTMLElement;
const labels = (canvas: HTMLElement) => [...canvas.querySelectorAll<HTMLElement>('[data-testid="edge-label"]')];

describe('TSK-007: React Flow canvas', () => {
  it('renders every node and every relationship, and reports the counts', async () => {
    const { canvas } = await mount();
    expect(canvas).toHaveAttribute('data-node-count', '5');
    expect(canvas).toHaveAttribute('data-edge-count', '4');
    expect(canvas.querySelectorAll('.react-flow__node')).toHaveLength(5);
    await waitFor(() => expect(labels(canvas)).toHaveLength(4));
  });

  it('describes the graph to assistive technology', async () => {
    const { canvas } = await mount();
    expect(canvas).toHaveAttribute('aria-label', expect.stringContaining('5 nodes and 4 relationships, 2 inferred and 2 verified'));
  });

  it('exposes zoom in, zoom out and fit-view controls', async () => {
    const { canvas } = await mount();
    const controls = within(canvas).getByLabelText('Graph view controls');
    const names = within(controls).getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect(names).toEqual(['Zoom In', 'Zoom Out', 'Fit View']);
  });

  it('renders a minimap and pan/zoom surface', async () => {
    const { canvas } = await mount();
    expect(canvas.querySelector('.react-flow__minimap')).not.toBeNull();
    expect(canvas.querySelector('.react-flow__pane')).not.toBeNull();
    expect(canvas.querySelector('.react-flow__viewport')).not.toBeNull();
  });

  it('zooms the viewport when Zoom In / Zoom Out are used', async () => {
    const user = userEvent.setup();
    const { canvas } = await mount();
    const viewport = canvas.querySelector('.react-flow__viewport') as HTMLElement;
    const zoomOf = () => Number(/scale\(([\d.]+)\)/.exec(viewport.style.transform)?.[1] ?? NaN);
    await waitFor(() => expect(zoomOf()).toBeGreaterThan(0));
    const start = zoomOf();
    await user.click(within(canvas).getByRole('button', { name: 'Zoom In' }));
    await waitFor(() => expect(zoomOf()).toBeGreaterThan(start));
    const zoomedIn = zoomOf();
    await user.click(within(canvas).getByRole('button', { name: 'Zoom Out' }));
    await waitFor(() => expect(zoomOf()).toBeLessThan(zoomedIn));
  });

  it('selects a node on click, marks it selected, and reports the id', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    const { canvas } = await mount({ onSelectSpy: spy });
    await user.click(screen.getByRole('button', { name: /Repository: saas-core-api/ }));
    expect(spy).toHaveBeenLastCalledWith('asset-repo-01');
    await waitFor(() => expect(nodeEl(canvas, 'asset-repo-01')).toHaveClass('selected'));
  });

  it('toggles selection off when the selected node is clicked again, and on pane click', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    const { canvas } = await mount({ onSelectSpy: spy });
    const repo = screen.getByRole('button', { name: /Repository: saas-core-api/ });
    await user.click(repo);
    await user.click(repo);
    expect(spy).toHaveBeenLastCalledWith(null);
    await user.click(repo);
    await user.click(canvas.querySelector('.react-flow__pane') as HTMLElement);
    expect(spy).toHaveBeenLastCalledWith(null);
  });

  it('makes nodes keyboard focusable and selectable with Enter', async () => {
    const spy = vi.fn();
    const { canvas } = await mount({ onSelectSpy: spy });
    const node = nodeEl(canvas, 'asset-cloud-01');
    expect(node).toHaveAttribute('tabindex', '0');
    node.focus();
    fireEvent.keyDown(node, { key: 'Enter', code: 'Enter' });
    await waitFor(() => expect(spy).toHaveBeenCalledWith('asset-cloud-01'));
  });

  it('highlights edges connected to the selected node and dims the others', async () => {
    const user = userEvent.setup();
    const { canvas } = await mount();
    await user.click(screen.getByRole('button', { name: /Identity: StagingDeployer/ }));
    await waitFor(() => {
      const faded = labels(canvas).filter((l) => parseFloat(l.style.opacity) < 1).map((l) => l.getAttribute('data-edge-id'));
      expect(faded).toEqual(['edge-repo-finding']);
    });
  });

  it('keeps the same node identity (no remount) when only selection changes', async () => {
    const user = userEvent.setup();
    const { canvas } = await mount();
    const before = nodeEl(canvas, 'asset-repo-01');
    await user.click(screen.getByRole('button', { name: /Repository: saas-core-api/ }));
    await waitFor(() => expect(nodeEl(canvas, 'asset-repo-01')).toHaveClass('selected'));
    expect(nodeEl(canvas, 'asset-repo-01')).toBe(before);
  });

  it('renders an empty graph without crashing', async () => {
    const empty: SecurityGraph = { nodes: [], edges: [], updatedAt: '2026-11-14T10:10:00Z' };
    render(<Harness graph={empty} />);
    const canvas = await screen.findByTestId('graph-canvas');
    expect(canvas).toHaveAttribute('data-node-count', '0');
    expect(canvas.querySelectorAll('.react-flow__node')).toHaveLength(0);
  });

  it('survives a single node with no edges', async () => {
    const single: SecurityGraph = {
      updatedAt: 't',
      nodes: [{ id: 'only', label: 'Lonely asset', type: 'ASSET' }],
      edges: [],
    };
    const { canvas } = await mount({ graph: single });
    expect(canvas.querySelectorAll('.react-flow__node')).toHaveLength(1);
    expect(labels(canvas)).toHaveLength(0);
  });

  it('ignores an edge whose endpoint is unknown instead of throwing', async () => {
    const broken: SecurityGraph = {
      ...PREVIEW_GRAPH,
      edges: [...PREVIEW_GRAPH.edges, { id: 'ghost', source: 'missing', target: 'asset-repo-01', relationship: 'DEPENDS_ON', inferred: false }],
    };
    const { canvas } = await mount({ graph: broken });
    await waitFor(() => expect(labels(canvas)).toHaveLength(4));
    expect(labels(canvas).some((l) => l.getAttribute('data-edge-id') === 'ghost')).toBe(false);
  });

  it('sizes responsively: fixed height tiers, full width of its container', async () => {
    const { canvas } = await mount();
    expect(canvas.className).toMatch(/h-\[440px\]/);
    expect(canvas.className).toMatch(/md:h-\[460px\]/);
    expect(canvas.className).toMatch(/w-full/);
  });

  it('hides the minimap on narrow screens via a responsive class', async () => {
    const { canvas } = await mount();
    expect(canvas.querySelector('.react-flow__minimap')?.className).toMatch(/!hidden/);
  });

  it('updates cleanly when the graph changes (new edge appears, counts update)', async () => {
    const { rerender, canvas } = await mount();
    const bigger: SecurityGraph = {
      ...PREVIEW_GRAPH,
      updatedAt: '2026-11-15T00:00:00Z',
      nodes: [...PREVIEW_GRAPH.nodes, { id: 'extra', label: 'Extra domain', type: 'ASSET', data: { assetType: 'DOMAIN' } }],
      edges: [...PREVIEW_GRAPH.edges, { id: 'extra-edge', source: 'extra', target: 'asset-repo-01', relationship: 'EXPOSES', inferred: true, confidence: 0.5 }],
    };
    rerender(<Harness graph={bigger} />);
    await waitFor(() => expect(canvas).toHaveAttribute('data-node-count', '6'));
    await waitFor(() => expect(labels(canvas)).toHaveLength(5));
  });
});

describe('TSK-010: custom nodes', () => {
  it('renders repository, identity and target asset cards with real asset data', async () => {
    const { canvas } = await mount();
    const repo = within(nodeEl(canvas, 'asset-repo-01'));
    expect(repo.getByText('Repository')).toBeInTheDocument();
    expect(repo.getByText('saas-core-api')).toBeInTheDocument();
    expect(repo.getByText('Production')).toBeInTheDocument();
    expect(repo.getByText('Critical criticality')).toBeInTheDocument();
    expect(repo.getByText('branch main')).toBeInTheDocument();

    expect(repo.getByText('Owner: Engineering Team')).toBeInTheDocument();

    expect(within(nodeEl(canvas, 'asset-storage-01')).getByText('Target')).toBeInTheDocument();
  });

  it('renders the payload IDENTITY node as an identity card with its real backing asset, owner and environment', async () => {
    const { canvas } = await mount();
    const identity = within(nodeEl(canvas, 'asset-cloud-01'));
    expect(identity.getByText('Identity')).toBeInTheDocument();
    expect(identity.getByText('StagingDeployer (IAM role)')).toBeInTheDocument();
    expect(identity.getByText('in cloud account aws-production-account')).toBeInTheDocument();
    expect(identity.getByText('Owner: DevOps Team')).toBeInTheDocument();
    expect(identity.getByText('Production')).toBeInTheDocument();
    expect(canvas.querySelectorAll('[data-testid="identity-node"]')).toHaveLength(1);
  });

  it('does not render an identity card when the payload has no IDENTITY node', async () => {
    const noIdentity: SecurityGraph = {
      ...PREVIEW_GRAPH,
      nodes: PREVIEW_GRAPH.nodes.map((n) => (n.type === 'IDENTITY' ? { ...n, type: 'ASSET' as const } : n)),
    };
    const { canvas } = await mount({ graph: noIdentity });
    expect(canvas.querySelectorAll('[data-testid="identity-node"]')).toHaveLength(0);
    expect(canvas.querySelectorAll('[data-testid="asset-node"]')).toHaveLength(3);
  });

  it('distinguishes asset, identity and finding cards', async () => {
    const { canvas } = await mount();
    expect(canvas.querySelectorAll('[data-testid="asset-node"]')).toHaveLength(2);
    expect(canvas.querySelectorAll('[data-testid="identity-node"]')).toHaveLength(1);
    expect(canvas.querySelectorAll('[data-testid="finding-node"]')).toHaveLength(2);
    expect(canvas.querySelector('[data-testid="finding-node"]')?.className).toMatch(/border-dashed/);
    expect(canvas.querySelector('[data-testid="asset-node"]')?.className).not.toMatch(/border-dashed/);
  });

  it('finding cards show severity, scanner, provenance and associated asset', async () => {
    const { canvas } = await mount();
    const card = within(nodeEl(canvas, 'find-sec-01'));
    expect(card.getByText('Leaked AWS secret key')).toBeInTheDocument();
    expect(card.getByText('Critical')).toBeInTheDocument();
    expect(card.getByText('gitleaks')).toBeInTheDocument();
    expect(card.getByText('Simulated demo')).toBeInTheDocument();
    expect(card.getByText('on saas-core-api')).toBeInTheDocument();

    const iac = within(nodeEl(canvas, 'find-iac-01'));
    expect(iac.getByText('High')).toBeInTheDocument();
    expect(iac.getByText('checkov')).toBeInTheDocument();
    expect(iac.getByText('on aws-production-account')).toBeInTheDocument();
  });

  it('never renders secret values or credentials on any node', async () => {
    const { canvas } = await mount();
    expect(canvas.textContent).not.toMatch(/AKIA|wJalr|SECRET_ACCESS_KEY|ghp_/);
  });

  it('flags simulated assets in preview and not for backend data', async () => {
    const preview = await mount();
    expect(within(nodeEl(preview.canvas, 'asset-repo-01')).getByText('Simulated demo data')).toBeInTheDocument();
    preview.unmount();
    const live = await mount({ origin: 'BACKEND_API' });
    expect(within(nodeEl(live.canvas, 'asset-repo-01')).queryByText('Simulated demo data')).not.toBeInTheDocument();
  });

  it('shows observed provenance as Observed, never as simulated', async () => {
    const observed = PREVIEW_FINDINGS.map((f) => ({ ...f, provenance: 'OBSERVED' as const }));
    render(
      <GraphCanvas
        graph={PREVIEW_GRAPH}
        assets={PREVIEW_ASSETS}
        findings={observed}
        selectedId={null}
        onSelect={() => {}}
        highlight={NO_HIGHLIGHT}
        origin="BACKEND_API"
      />,
    );
    const canvas = await screen.findByTestId('graph-canvas');
    await waitFor(() => expect(canvas.querySelectorAll('.react-flow__node').length).toBe(5));
    const card = within(nodeEl(canvas, 'find-sec-01'));
    expect(card.getByText('Observed')).toBeInTheDocument();
    expect(card.queryByText(/Simulated/)).not.toBeInTheDocument();
  });

  it('degrades gracefully for a finding whose asset or data is missing', async () => {
    render(
      <GraphCanvas
        graph={PREVIEW_GRAPH}
        assets={[]}
        findings={[]}
        selectedId={null}
        onSelect={() => {}}
        highlight={NO_HIGHLIGHT}
        origin="BACKEND_API"
      />,
    );
    const canvas = await screen.findByTestId('graph-canvas');
    await waitFor(() => expect(canvas.querySelectorAll('.react-flow__node').length).toBe(5));
    const card = within(nodeEl(canvas, 'find-sec-01'));
    expect(card.getByText('Leaked AWS secret key')).toBeInTheDocument();
    expect(card.queryByText(/^on /)).not.toBeInTheDocument();
  });
});

describe('TSK-010: custom edges', () => {
  it('labels each relationship with its type', async () => {
    const { canvas } = await mount();
    await waitFor(() => expect(labels(canvas)).toHaveLength(4));
    const text = labels(canvas).map((l) => l.textContent);
    expect(text.some((t) => t?.includes('stores credential for'))).toBe(true);
    expect(text.some((t) => t?.includes('grants access to'))).toBe(true);
    expect(text.filter((t) => t?.includes('exposes'))).toHaveLength(2);
  });

  it('shows confidence on inferred edges and the word "verified" on recorded ones', async () => {
    const { canvas } = await mount();
    await waitFor(() => expect(labels(canvas)).toHaveLength(4));
    const byId = Object.fromEntries(labels(canvas).map((l) => [l.getAttribute('data-edge-id'), l.textContent]));
    expect(byId['rel-01']).toContain('inferred · 98%');
    expect(byId['rel-02']).toContain('inferred · 95%');
    expect(byId['edge-repo-finding']).toContain('verified');
    expect(byId['edge-repo-finding']).not.toContain('%');
  });

  it('draws inferred edges dashed and verified edges solid', async () => {
    const { canvas } = await mount();
    await waitFor(() => expect(canvas.querySelectorAll('.react-flow__edge-path').length).toBe(4));
    const dash = (id: string) => (canvas.querySelector(`.react-flow__edge[data-id="${id}"] .react-flow__edge-path`) as SVGPathElement).style.strokeDasharray;
    expect(dash('rel-01')).not.toBe('');
    expect(dash('rel-02')).not.toBe('');
    expect(dash('edge-repo-finding')).toBe('');
    expect(dash('edge-cloud-finding')).toBe('');
  });

  it('uses different stroke colours for verified, inferred and path edges', async () => {
    const h = pathHighlight(PREVIEW_GRAPH, PREVIEW_ATTACK_PATHS[0]);
    const { canvas } = await mount({ highlight: h });
    await waitFor(() => expect(canvas.querySelectorAll('.react-flow__edge-path').length).toBe(4));
    const stroke = (id: string) => (canvas.querySelector(`.react-flow__edge[data-id="${id}"] .react-flow__edge-path`) as SVGPathElement).style.stroke;
    expect(stroke('edge-repo-finding')).toMatch(/91, ?133, ?255|#5B85FF/i);
    expect(stroke('rel-01')).toMatch(/240, ?69, ?90|#F0455A/i);
    expect(stroke('rel-01')).toBe(stroke('rel-02'));
    expect(stroke('rel-01')).not.toBe(stroke('edge-repo-finding'));
  });
});

describe('TSK-010: active path highlighting', () => {
  const h = () => pathHighlight(PREVIEW_GRAPH, PREVIEW_ATTACK_PATHS[0]);

  it('marks on-path nodes and edges and dims the rest', async () => {
    const { canvas } = await mount({ highlight: h() });
    await waitFor(() => expect(labels(canvas)).toHaveLength(4));
    const onPath = labels(canvas).filter((l) => l.getAttribute('data-on-path') === 'true').map((l) => l.getAttribute('data-edge-id'));
    expect(onPath.sort()).toEqual(['rel-01', 'rel-02']);
    for (const id of ['asset-repo-01', 'asset-cloud-01', 'asset-storage-01', 'find-sec-01', 'find-iac-01']) {
      expect(nodeEl(canvas, id).querySelector('[data-on-path="true"]'), id).not.toBeNull();
    }
    const dimmed = labels(canvas).filter((l) => parseFloat(l.style.opacity) < 1).map((l) => l.getAttribute('data-edge-id'));
    expect(dimmed.sort()).toEqual(['edge-cloud-finding', 'edge-repo-finding']);
  });

  it('highlights nothing by default', async () => {
    const { canvas } = await mount();
    await waitFor(() => expect(labels(canvas)).toHaveLength(4));
    expect(labels(canvas).some((l) => l.getAttribute('data-on-path') === 'true')).toBe(false);
    expect(canvas.querySelector('[data-on-path="true"]')).toBeNull();
  });

  it('animates the active path edges only', async () => {
    mockReducedMotion(false);
    const { canvas } = await mount({ highlight: h() });
    await waitFor(() => expect(labels(canvas)).toHaveLength(4));
    const animated = labels(canvas).filter((l) => l.getAttribute('data-animated') === 'true').map((l) => l.getAttribute('data-edge-id'));
    expect(animated.sort()).toEqual(['rel-01', 'rel-02']);
    expect(canvas.querySelectorAll('.edge-flow')).toHaveLength(2);
  });

  it('does NOT animate inferred edges that are not on the highlighted path', async () => {
    mockReducedMotion(false);
    const { canvas } = await mount();
    await waitFor(() => expect(labels(canvas)).toHaveLength(4));
    expect(canvas.querySelectorAll('.edge-flow')).toHaveLength(0);
  });

  it('respects prefers-reduced-motion: path stays highlighted but nothing animates', async () => {
    mockReducedMotion(true);
    const { canvas } = await mount({ highlight: h() });
    await waitFor(() => expect(labels(canvas)).toHaveLength(4));
    expect(canvas.querySelectorAll('.edge-flow')).toHaveLength(0);
    expect(labels(canvas).some((l) => l.getAttribute('data-animated') === 'true')).toBe(false);
    expect(labels(canvas).filter((l) => l.getAttribute('data-on-path') === 'true')).toHaveLength(2);
  });

  it('reacts live when the highlight is turned on and off', async () => {
    mockReducedMotion(false);
    const { rerender, canvas } = await mount();
    rerender(<Harness highlight={h()} />);
    await waitFor(() => expect(canvas.querySelectorAll('.edge-flow')).toHaveLength(2));
    await act(async () => rerender(<Harness highlight={NO_HIGHLIGHT} />));
    await waitFor(() => expect(canvas.querySelectorAll('.edge-flow')).toHaveLength(0));
  });
});
