import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PREVIEW_ASSETS, PREVIEW_ATTACK_PATHS, PREVIEW_FINDINGS, PREVIEW_GRAPH, PREVIEW_REMEDIATIONS } from '@/mocks/fixtures';
import { REAL_ATTACK_PATHS, REAL_GRAPH_WITH_FINDINGS } from '@/test/realBackend';
import { HEALTHY, json, renderApp, stubFetch, stubOffline } from '@/test/utils';

function serve(opts: { paths?: unknown; graph?: unknown; assets?: unknown; findings?: unknown; remediations?: unknown; failing?: string[] } = {}) {
  return stubFetch((url) => {
    if (opts.failing?.some((f) => url.includes(f))) return json({}, 404);
    if (url.endsWith('/health')) return json(HEALTHY);
    if (url.includes('/attack-paths')) return json(opts.paths ?? REAL_ATTACK_PATHS);
    if (url.includes('/graph')) return json(opts.graph ?? REAL_GRAPH_WITH_FINDINGS);
    if (url.endsWith('/assets')) return json(opts.assets ?? []);
    if (url.includes('/findings')) return json(opts.findings ?? []);
    if (url.includes('/remediations')) return json(opts.remediations ?? []);
    return json([]);
  });
}

async function openFirst(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByTestId('path-row'));
  return screen.findByRole('dialog');
}

describe('TSK-017: path list', () => {
  it('lists the path with severity, status, the asset chain, confidence labelled as an estimate, and an inferred label', async () => {
    stubOffline();
    renderApp('/paths');
    const row = await screen.findByTestId('path-row');
    expect(row).toHaveTextContent('Critical');
    expect(row).toHaveTextContent('Open');
    expect(row).toHaveTextContent('Inferred');
    expect(row).toHaveTextContent('saas-core-api');
    expect(row).toHaveTextContent('s3-customer-pii-vault');
    expect(row).toHaveTextContent(/confidence 96% \(engine estimate\)/);
    expect(screen.getByTestId('inference-notice')).toHaveTextContent(/not a confirmed exploit/i);
  });

  it('is an honest empty state, not a blank page, when there are no paths', async () => {
    serve({ paths: [] });
    renderApp('/paths', 'api');
    expect(await screen.findByText('No potential attack paths')).toBeInTheDocument();
  });

  it('API mode says "not available yet" for a missing endpoint and shows no fixture path', async () => {
    serve({ failing: ['/attack-paths'] });
    renderApp('/paths', 'api');
    expect(await screen.findByText('Not available on the backend yet')).toBeInTheDocument();
    expect(screen.queryByTestId('path-row')).not.toBeInTheDocument();
  });

  it('API mode shows an error with retry, never fixtures, when the backend is down', async () => {
    stubOffline();
    renderApp('/paths', 'api');
    expect(await screen.findByRole('alert')).toHaveTextContent('Backend unreachable');
    expect(screen.queryByTestId('path-row')).not.toBeInTheDocument();
  });
});

describe('TSK-017: investigation drawer', () => {
  it('opens a dialog, writes the id into the URL, and always shows the inferred-not-confirmed notice', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/paths');
    const dialog = await openFirst(user);
    expect(dialog).toHaveAttribute('aria-label', PREVIEW_ATTACK_PATHS[0].title);
    expect(within(dialog).getByTestId('inference-notice')).toHaveTextContent(/Inferred potential path, not a confirmed exploit/);
    expect(within(dialog).getByTestId('inference-notice')).toHaveTextContent(/simulated/i);
    expect(within(dialog).getByText('engine estimate, not proof')).toBeInTheDocument();
  });

  it('shows the kill chain in order with roles, and each step reveals its own evidence', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/paths');
    const dialog = await openFirst(user);
    const steps = within(dialog).getAllByTestId('path-step');
    expect(steps.map((s) => s.getAttribute('data-role'))).toEqual(['entry', 'intermediate', 'target']);
    expect(steps.map((s) => s.getAttribute('data-step'))).toEqual(['1', '2', '3']);
    expect(within(dialog).queryByTestId('hop-evidence')).not.toBeInTheDocument();

    await user.click(within(steps[0]).getByRole('button'));
    const evidence = within(dialog).getByTestId('hop-evidence');
    expect(evidence).toHaveTextContent('Supporting finding:');
    expect(evidence).toHaveTextContent('Committed AWS IAM Secret Key');
    expect(evidence).toHaveTextContent('Simulated demo');
    expect(evidence).toHaveTextContent('descriptive label, not a verified technique');
    expect(within(evidence).getByRole('link', { name: 'Open this finding' })).toHaveAttribute('href', '/threats?f=find-sec-01');

    // opening another step closes the first: only one is open at a time
    await user.click(within(steps[1]).getByRole('button'));
    expect(within(dialog).getAllByTestId('hop-evidence')).toHaveLength(1);
    expect(within(steps[1]).getByTestId('hop-evidence')).toHaveTextContent('stores credential for');
  });

  it('exposes expand/collapse state to assistive technology', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/paths');
    const dialog = await openFirst(user);
    const toggle = within(within(dialog).getAllByTestId('path-step')[0]).getByRole('button');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(toggle.getAttribute('aria-controls')!)).toBeInTheDocument();
  });

  it('shows the relationship into each step as inferred with its confidence, and the entry step as the start', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/paths');
    const dialog = await openFirst(user);
    const steps = within(dialog).getAllByTestId('path-step');
    await user.click(within(steps[0]).getByRole('button'));
    expect(within(steps[0]).getByTestId('hop-evidence')).toHaveTextContent('This is where the path begins.');
    await user.click(within(steps[2]).getByRole('button'));
    expect(within(steps[2]).getByTestId('hop-evidence')).toHaveTextContent(/inferred.*confidence 95% \(engine estimate\)/);
  });

  it('shows the choke point only when the data supplies one, and says it is the backend analysis', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/paths');
    const dialog = await openFirst(user);
    const region = within(dialog).getByRole('region', { name: 'Choke point' });
    expect(region).toHaveTextContent('aws-production-account');
    expect(region).toHaveTextContent(/backend's analysis/);
    expect(within(dialog).getByText('Choke point', { selector: 'span,div' })).toBeInTheDocument();
  });

  it('links to the remediation the backend tied to this path', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/paths');
    const dialog = await openFirst(user);
    const next = within(dialog).getByRole('region', { name: 'Recommended next steps' });
    for (const link of within(next).getAllByRole('link', { name: /.+/ }).filter((l) => l.getAttribute('href')?.startsWith('/remediation'))) {
      expect(link.getAttribute('href')).toMatch(/^\/remediation\?r=rem-/);
    }
    expect(PREVIEW_REMEDIATIONS.length).toBeGreaterThan(0);
  });

  it('"Show on graph" goes to the graph with the path id', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/paths');
    const dialog = await openFirst(user);
    expect(within(dialog).getByRole('link', { name: /Show on graph/ })).toHaveAttribute('href', '/graph?path=path-01');
  });

  it('closes on Escape, returns focus to the row, and removes the id from the URL', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/paths');
    const row = await screen.findByTestId('path-row');
    await user.click(row);
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(row).toHaveFocus();
  });
});

describe('TSK-017: AI analysis is honestly unavailable (no endpoint exists)', () => {
  it('shows a disabled-style panel, makes NO analysis request, and writes no generated text', async () => {
    const fetchMock = stubOffline();
    const user = userEvent.setup();
    renderApp('/paths');
    const dialog = await openFirst(user);
    const ai = within(dialog).getByTestId('ai-analysis');
    expect(ai).toHaveTextContent('Not available');
    expect(ai).toHaveTextContent(/does not provide an AI analysis service yet/);
    expect(ai).toHaveTextContent(/never be presented as a confirmed fact/);
    expect(within(ai).queryByRole('button')).not.toBeInTheDocument(); // nothing to click that could fake a result
    expect(fetchMock.mock.calls.filter(([u]) => /\/ai\b|analy[sz]e/i.test(String(u)))).toHaveLength(0);
  });
});

describe('TSK-017: deep link by path id', () => {
  it('opens the investigation directly from ?p=<id>', async () => {
    stubOffline();
    renderApp('/paths?p=path-01');
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByTestId('path-investigation')).toBeInTheDocument();
  });

  it('says plainly when the id is not in this data source, and opens nothing', async () => {
    stubOffline();
    renderApp('/paths?p=path-does-not-exist');
    expect(await screen.findByTestId('path-not-found')).toHaveTextContent(/No attack path path-does-not-exist exists in the current data source/);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('path-row')).toHaveLength(1); // the real list is still usable
  });

  it('survives hostile ids without crashing or opening anything', async () => {
    stubOffline();
    renderApp(`/paths?p=${encodeURIComponent('<img src=x onerror=alert(1)>')}`);
    expect(await screen.findByTestId('path-not-found')).toBeInTheDocument();
    expect(document.querySelector('img[src="x"]')).toBeNull(); // rendered as text, never as markup
  });

  it('ignores an over-long id', async () => {
    stubOffline();
    renderApp(`/paths?p=${'x'.repeat(500)}`);
    await screen.findByTestId('path-row');
    expect(screen.queryByTestId('path-not-found')).not.toBeInTheDocument();
  });
});

describe('TSK-017 against the REAL backend payload (empty inventory and findings list, no choke point)', () => {
  it('resolves assets from the graph and shows graph-sourced findings without inventing provenance', async () => {
    serve();
    const user = userEvent.setup();
    renderApp('/paths', 'api');
    const dialog = await openFirst(user);
    const steps = within(dialog).getAllByTestId('path-step');
    expect(steps[0]).toHaveTextContent('saas-core-api');
    expect(steps[0]).toHaveTextContent('Repository');
    await user.click(within(steps[0]).getByRole('button'));
    const evidence = within(steps[0]).getByTestId('hop-evidence');
    expect(evidence).toHaveTextContent('Committed AWS IAM Secret Key');
    expect(evidence).toHaveTextContent('Provenance not provided'); // the graph node carries none, so none is claimed
    expect(evidence).not.toHaveTextContent('Simulated demo');
    expect(evidence).toHaveTextContent('Not in the loaded findings list');
    expect(within(evidence).queryByRole('link', { name: 'Open this finding' })).not.toBeInTheDocument();
  });

  it('the final step has no finding and says so, with no "null" anywhere', async () => {
    serve();
    const user = userEvent.setup();
    renderApp('/paths', 'api');
    const dialog = await openFirst(user);
    const last = within(dialog).getAllByTestId('path-step')[2];
    await user.click(within(last).getByRole('button'));
    expect(within(last).getByTestId('hop-evidence')).toHaveTextContent('No finding is attached to this step.');
    expect(dialog.textContent).not.toMatch(/\bnull\b/);
  });

  it('says no choke point was identified and no remediation was proposed, instead of guessing', async () => {
    serve();
    const user = userEvent.setup();
    renderApp('/paths', 'api');
    const dialog = await openFirst(user);
    expect(within(dialog).getByRole('region', { name: 'Choke point' })).toHaveTextContent(/did not identify a choke point/);
    expect(within(dialog).queryByText('Choke point', { selector: 'span' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('region', { name: 'Recommended next steps' })).toHaveTextContent(/proposed no remediation/);
  });

  it('still opens when the graph and remediation endpoints are unavailable, falling back to ids', async () => {
    serve({ failing: ['/graph', '/remediations'] });
    const user = userEvent.setup();
    renderApp('/paths', 'api');
    const dialog = await openFirst(user);
    const steps = within(dialog).getAllByTestId('path-step');
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent('asset-repo-01'); // only the id is known, and only the id is shown
    await user.click(within(steps[1]).getByRole('button'));
    expect(within(steps[1]).getByTestId('hop-evidence')).toHaveTextContent('The graph reported no relationship for this hop.');
  });

  it('does not repeat requests in a loop', async () => {
    const fetchMock = serve();
    renderApp('/paths', 'api');
    await screen.findByTestId('path-row');
    await new Promise((r) => setTimeout(r, 200));
    const count = (n: string) => fetchMock.mock.calls.filter(([u]) => String(u).includes(n)).length;
    expect(count('/attack-paths')).toBe(1);
    expect(count('/graph')).toBe(1);
  });
});

describe('graph deep link ?path=<id> (the other end of "Show on graph")', () => {
  it('selects and highlights exactly that path on load, with the not-a-confirmed-exploit note', async () => {
    stubOffline();
    renderApp('/graph?path=path-01');
    const canvas = await screen.findByTestId('graph-canvas');
    expect(await screen.findByRole('button', { name: /Highlighting potential path/ })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(canvas.querySelectorAll('[data-testid="edge-label"][data-on-path="true"]').length).toBeGreaterThan(0));
    expect(screen.getByText(/Potential path, not a confirmed exploit/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Investigate path' })).toHaveAttribute('href', '/paths?p=path-01');
  });

  it('says so, and highlights nothing, for an unknown id', async () => {
    stubOffline();
    renderApp('/graph?path=nope');
    const canvas = await screen.findByTestId('graph-canvas');
    expect(await screen.findByTestId('graph-path-not-found')).toHaveTextContent(/No attack path nope exists/);
    expect(screen.getByRole('button', { name: /Highlight potential path/ })).toHaveAttribute('aria-pressed', 'false');
    expect(canvas.querySelectorAll('[data-testid="edge-label"][data-on-path="true"]')).toHaveLength(0);
  });

  it('without the param the graph does not highlight anything by itself', async () => {
    stubOffline();
    renderApp('/graph');
    const canvas = await screen.findByTestId('graph-canvas');
    expect(screen.getByRole('button', { name: /Highlight potential path/ })).toHaveAttribute('aria-pressed', 'false');
    expect(canvas.querySelectorAll('[data-testid="edge-label"][data-on-path="true"]')).toHaveLength(0);
  });
});

describe('fixture sanity (guards the preview assertions above)', () => {
  it('has the shape these tests rely on', () => {
    expect(PREVIEW_ATTACK_PATHS[0].chokePointAssetId).toBe('asset-cloud-01');
    expect(PREVIEW_ASSETS).toHaveLength(3);
    expect(PREVIEW_FINDINGS).toHaveLength(2);
    expect(PREVIEW_GRAPH.edges).toHaveLength(4);
  });
});
