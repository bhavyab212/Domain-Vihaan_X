import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PREVIEW_ASSETS, PREVIEW_ATTACK_PATHS, PREVIEW_FINDINGS, PREVIEW_GRAPH, PREVIEW_REMEDIATIONS } from '@/mocks/fixtures';
import { REAL_ATTACK_PATHS, REAL_GRAPH } from '@/test/realBackend';
import { HEALTHY, json, renderApp, resetBody, stubFetch, stubOffline } from '@/test/utils';

const REAL_HEALTH = {
  status: 'healthy',
  mode: 'DEMO_MODE',
  scanners: { gitleaks: 'unverified', checkov: 'unverified', trivy: 'unverified', subfinder: 'unverified', hexstrike: 'optional-unconfigured' },
};

/** Serve what Dev A's real backend returns today: healthy, empty inventory and findings, populated graph and path. */
function serveRealBackend(overrides: Record<string, unknown> = {}) {
  return stubFetch((url, init) => {
    if (init?.method === 'POST') return json(resetBody());
    if (url.endsWith('/health')) return json(overrides.health ?? REAL_HEALTH);
    if (url.includes('/graph')) return json(overrides.graph ?? REAL_GRAPH);
    if (url.includes('/attack-paths')) return json(overrides.paths ?? REAL_ATTACK_PATHS);
    if (url.endsWith('/assets')) return json(overrides.assets ?? []);
    if (url.includes('/findings')) return json(overrides.findings ?? []);
    if (url.includes('/remediations')) return json(overrides.remediations ?? []);
    return json([]);
  });
}

const kpi = (id: string) => screen.findByTestId(id);

describe('Command Center: KPIs are tallies of what the source returned', () => {
  it('preview mode: counts the fixtures and links each KPI to its filtered view', async () => {
    stubOffline();
    renderApp('/');
    const assets = await kpi('kpi-assets');
    expect(assets).toHaveTextContent('3');
    expect(assets).toHaveAttribute('href', '/graph');

    const findings = await kpi('kpi-findings');
    expect(findings).toHaveTextContent('2');
    expect(findings).toHaveTextContent(/1\s*Critical/);
    expect(findings).toHaveTextContent(/1\s*High/);
    expect(findings).toHaveAttribute('href', '/threats?severity=CRITICAL'); // goes straight to the critical ones

    const paths = await kpi('kpi-paths');
    expect(paths).toHaveTextContent('1');
    expect(paths).toHaveTextContent(/not confirmed exploits/i);
    expect(paths).toHaveAttribute('href', '/paths');

    const rem = await kpi('kpi-remediations');
    expect(rem).toHaveTextContent('2');
    expect(rem).toHaveTextContent(/2\s*awaiting approval/);
    expect(rem).toHaveTextContent(/0\s*verified/);
    expect(rem).toHaveAttribute('href', '/remediation');
  });

  it('shows no posture score, risk score, trend or velocity anywhere', async () => {
    stubOffline();
    renderApp('/');
    await kpi('kpi-assets');
    expect(document.body).not.toHaveTextContent(/risk score|posture score|security score|trend|velocity|% (secure|safe)/i);
  });

  it('the critical KPI deep link really lands on the filtered findings', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/');
    await user.click(await kpi('kpi-findings'));
    const rows = await screen.findAllByTestId('finding-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Committed AWS IAM Secret Key');
  });
});

describe('Command Center against the REAL backend shape (empty inventory, populated graph)', () => {
  it('counts assets from the graph and says so, never shows 0', async () => {
    serveRealBackend();
    renderApp('/', 'api');
    const assets = await kpi('kpi-assets');
    expect(assets).toHaveTextContent('3');
    expect(assets).toHaveTextContent(/named by the graph/i);
    expect(assets).not.toHaveTextContent(/registered in the inventory/i);
  });

  it('does not invent a findings breakdown when the list is empty but the graph reports findings', async () => {
    serveRealBackend();
    renderApp('/', 'api');
    const findings = await kpi('kpi-findings');
    expect(findings).toHaveTextContent('—');
    expect(findings).toHaveTextContent(/graph reports 2/i);
    expect(findings).toHaveTextContent(/no breakdown is invented/i);
    expect(findings).not.toHaveTextContent(/critical/i);
  });

  it('lists the graph-named assets with only the facts the graph supplied, labelled as graph-derived', async () => {
    serveRealBackend();
    renderApp('/', 'api');
    const panel = (await screen.findByText('Asset inventory')).closest('section') as HTMLElement;
    expect(panel).toHaveTextContent(/named by the graph\. The inventory endpoint returned none/i);
    expect(within(panel).getByText('saas-core-api')).toBeInTheDocument();
    expect(panel).toHaveTextContent('Repository · Production · Engineering Team');
    expect(panel).toHaveTextContent('Cloud account · Production · DevOps Team');
  });

  it('renders the real attack path as a most-severe preview, as inferred and not a confirmed exploit', async () => {
    serveRealBackend();
    renderApp('/', 'api');
    const preview = await screen.findByTestId('path-preview');
    expect(preview).toHaveTextContent('Public Repository Secret to Crown Jewel S3 Data Exfiltration');
    expect(preview).toHaveTextContent(/not a confirmed exploit/i);
    expect(preview).toHaveTextContent('Inferred');
    expect(preview).toHaveTextContent(/confidence 96% \(engine estimate\)/);
    const steps = within(preview).getAllByTestId('path-preview-step');
    expect(steps.map((s) => s.textContent)).toEqual([
      expect.stringContaining('saas-core-api'),
      expect.stringContaining('aws-production-account'),
      expect.stringContaining('s3-customer-pii-vault'),
    ]);
    // the path's own provenance flag is respected: the real path says isSimulated
    expect(within(preview).getByText('Simulated demo')).toBeInTheDocument();
  });

  it('links the preview to the investigation of that exact path', async () => {
    serveRealBackend();
    renderApp('/', 'api');
    const link = await within(await screen.findByTestId('path-preview')).findByRole('link', { name: /Investigate/ });
    expect(link).toHaveAttribute('href', '/paths?p=path-01');
  });
});

describe('Command Center operating status is honest', () => {
  it('connecting: not online, scanners unknown, no mode claimed', async () => {
    stubFetch(() => new Promise<Response>(() => {})); // never answers
    renderApp('/', 'api');
    const strip = await screen.findByTestId('status-strip');
    expect(within(strip).getByTestId('status-backend')).toHaveAttribute('data-status', 'connecting');
    expect(strip).toHaveTextContent('Connecting...');
    expect(strip).toHaveTextContent(/unknown while the backend is connecting/i);
    expect(strip).not.toHaveTextContent('Online');
    expect(strip).not.toHaveTextContent(/Operating mode/);
  });

  it('unavailable: says so, scanners unknown, mode not claimed, never green', async () => {
    stubOffline();
    renderApp('/', 'api');
    const strip = await screen.findByTestId('status-strip');
    await waitFor(() => expect(within(strip).getByTestId('status-backend')).toHaveAttribute('data-status', 'offline'));
    expect(strip).toHaveTextContent('Unavailable');
    expect(strip).toHaveTextContent(/unknown while the backend is unavailable/i);
    expect(strip).not.toHaveTextContent('Online');
    expect(strip).not.toHaveTextContent(/Operating mode/);
  });

  it('online: shows the backend-reported mode and scanner states exactly as reported', async () => {
    serveRealBackend();
    renderApp('/', 'api');
    const strip = await screen.findByTestId('status-strip');
    await waitFor(() => expect(within(strip).getByTestId('status-backend')).toHaveAttribute('data-status', 'online'));
    expect(strip).toHaveTextContent('Operating mode: demo');
    const list = within(strip).getByRole('list', { name: /Scanner readiness as reported/ });
    const items = within(list).getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['checkov · unverified', 'gitleaks · unverified', 'hexstrike · optional-unconfigured', 'subfinder · unverified', 'trivy · unverified']);
  });

  it('"unverified" scanners are never presented as ready or healthy', async () => {
    serveRealBackend();
    renderApp('/', 'api');
    const strip = await screen.findByTestId('status-strip');
    await within(strip).findByRole('list', { name: /Scanner readiness/ });
    expect(strip).not.toHaveTextContent(/\bready\b/i);
    for (const badge of within(strip).getAllByTitle(/unverified/)) {
      expect(badge.className).not.toMatch(/\bok\b|emerald|green/);
    }
  });

  it('a scanner that reports "ready" is shown as ready', async () => {
    serveRealBackend({ health: { ...REAL_HEALTH, scanners: { gitleaks: 'ready', trivy: 'error' } } });
    renderApp('/', 'api');
    const strip = await screen.findByTestId('status-strip');
    expect(await within(strip).findByText('gitleaks · ready')).toBeInTheDocument();
    expect(within(strip).getByText('trivy · error')).toBeInTheDocument();
  });

  it('preview mode labels itself as synthetic and does not claim a backend mode', async () => {
    stubOffline();
    renderApp('/');
    const strip = await screen.findByTestId('status-strip');
    expect(strip).toHaveTextContent('Local preview');
    expect(strip).toHaveTextContent(/not scanner output/i);
  });
});

describe('Command Center: unavailable endpoints read as unavailable, not zero', () => {
  it('shows an em dash and a reason for attack paths and remediations that failed', async () => {
    stubFetch((url) => {
      if (url.endsWith('/health')) return json(HEALTHY);
      if (url.includes('/attack-paths') || url.includes('/remediations') || url.includes('/graph')) return json({}, 404);
      if (url.endsWith('/assets')) return json(PREVIEW_ASSETS);
      if (url.includes('/findings')) return json(PREVIEW_FINDINGS);
      return json([]);
    });
    renderApp('/', 'api');
    const paths = await kpi('kpi-paths');
    expect(paths).toHaveTextContent('—');
    expect(paths).toHaveTextContent(/not available from the backend yet/i);
    const rem = await kpi('kpi-remediations');
    expect(rem).toHaveTextContent('—');
    expect(rem).toHaveTextContent(/not available from the backend yet/i);
    const preview = await screen.findByTestId('path-preview');
    expect(preview).toHaveTextContent(/attack paths unavailable/i);
    expect(preview).toHaveTextContent(/nothing is inferred locally/i);
    // the other KPIs still work
    expect(await kpi('kpi-assets')).toHaveTextContent('3');
  });

  it('a genuinely empty backend shows zeros and empty states, not unavailable', async () => {
    serveRealBackend({ graph: { nodes: [], edges: [], updatedAt: 't' }, paths: [] });
    renderApp('/', 'api');
    expect(await kpi('kpi-paths')).toHaveTextContent('0');
    expect(await kpi('kpi-paths')).not.toHaveTextContent(/not available/i);
    expect(await kpi('kpi-assets')).toHaveTextContent('0');
    expect(await screen.findByText('No open potential attack paths')).toBeInTheDocument();
    expect(await screen.findByText('No assets registered')).toBeInTheDocument();
  });

  it('API mode never silently shows fixtures when the backend is down', async () => {
    stubOffline();
    renderApp('/', 'api');
    expect(await screen.findByRole('alert')).toHaveTextContent('Backend unreachable');
    expect(screen.queryByTestId('kpi-assets')).not.toBeInTheDocument();
    expect(screen.queryByText('saas-core-api')).not.toBeInTheDocument();
  });
});

describe('Command Center: reset surfaces only what the backend confirmed', () => {
  it('shows "no confirmed reset" first, then the backend resetAt after a confirmed reset', async () => {
    serveRealBackend();
    const user = userEvent.setup();
    renderApp('/', 'api');
    expect(await screen.findByTestId('last-reset')).toHaveTextContent(/No backend-confirmed reset in this session/);

    await user.click(screen.getByRole('button', { name: /Reset demo scenario/ }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Reset demo state' }));
    await waitFor(() => expect(screen.getByTestId('last-reset')).toHaveTextContent('Backend confirmed a reset at 15 Nov, 00:00 UTC'));
  });

  it('refetches the dashboard data after a confirmed reset', async () => {
    const fetchMock = serveRealBackend();
    const user = userEvent.setup();
    renderApp('/', 'api');
    await kpi('kpi-assets');
    const countGraph = () => fetchMock.mock.calls.filter(([u]) => String(u).includes('/graph')).length;
    const before = countGraph();
    await user.click(screen.getByRole('button', { name: /Reset demo scenario/ }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Reset demo state' }));
    await waitFor(() => expect(countGraph()).toBeGreaterThan(before));
  });

  it('a failed reset does not claim a confirmed one', async () => {
    stubFetch((url, init) => (init?.method === 'POST' ? json({}, 500) : url.endsWith('/health') ? json(REAL_HEALTH) : url.includes('/graph') ? json(REAL_GRAPH) : json([])));
    const user = userEvent.setup();
    renderApp('/', 'api');
    await user.click(await screen.findByRole('button', { name: /Reset demo scenario/ }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Reset demo state' }));
    expect(await screen.findByTestId('reset-feedback')).toHaveAttribute('data-phase', 'error');
    expect(screen.getByTestId('last-reset')).toHaveTextContent(/No backend-confirmed reset/);
  });
});

describe('fixtures sanity (guards the preview tests above)', () => {
  it('has the shape the preview assertions rely on', () => {
    expect(PREVIEW_ASSETS).toHaveLength(3);
    expect(PREVIEW_FINDINGS.filter((f) => f.status === 'OPEN')).toHaveLength(2);
    expect(PREVIEW_ATTACK_PATHS).toHaveLength(1);
    expect(PREVIEW_REMEDIATIONS).toHaveLength(2);
    expect(PREVIEW_GRAPH.nodes.length).toBeGreaterThan(0);
  });
});
