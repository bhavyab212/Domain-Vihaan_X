import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { HEALTHY, json, renderApp, stubFetch, stubOffline } from '@/test/utils';

const ROUTES: [string, string][] = [
  ['/', 'Security Command Center'],
  ['/graph', 'Business Security Graph'],
  ['/threats', 'Threats & Findings'],
  ['/paths', 'Attack Path Investigation'],
  ['/remediation', 'Remediation Studio'],
];

const primaryNav = () => screen.getAllByRole('navigation', { name: 'Primary' })[0];

describe('routing and navigation', () => {
  it('starts and renders the shell with all five navigation entries', async () => {
    stubOffline();
    renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Security Command Center' })).toBeInTheDocument();
    expect(within(primaryNav()).getAllByRole('link')).toHaveLength(5);
  });

  it.each(ROUTES)('renders %s with its page heading', async (route, heading) => {
    stubOffline();
    renderApp(route);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('navigates between routes and keeps exactly one active nav item', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/');

    for (const [route, heading] of ROUTES.slice(1)) {
      const link = within(primaryNav()).getByRole('link', { name: new RegExp(heading.split(' ')[0]) });
      await user.click(link);
      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      const active = within(primaryNav())
        .getAllByRole('link')
        .filter((l) => l.getAttribute('aria-current') === 'page');
      expect(active).toHaveLength(1);
      expect(active[0]).toHaveAttribute('href', route);
    }
  });

  it('marks "/" active only on the home route, not on every route', async () => {
    stubOffline();
    renderApp('/threats');
    await screen.findByRole('heading', { level: 1, name: 'Threats & Findings' });
    const home = within(primaryNav()).getByRole('link', { name: /Command Center/ });
    expect(home).not.toHaveAttribute('aria-current');
  });

  it('shows a not-found state for unknown routes instead of a blank page', async () => {
    stubOffline();
    renderApp('/nope');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });
});

describe('offline usability and preview provenance', () => {
  it('stays usable in local preview when the backend is offline', async () => {
    stubOffline();
    renderApp('/');
    expect(await screen.findByText('saas-core-api')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset demo scenario/ })).toBeEnabled();
    expect(screen.getByRole('link', { name: /Business Security Graph/ })).toBeInTheDocument();
  });

  it('labels preview data as simulated demo data, not live monitoring', async () => {
    stubOffline();
    renderApp('/');
    const banner = await screen.findByTestId('preview-banner');
    expect(banner).toHaveTextContent('SIMULATED_DEMO');
    expect(banner).toHaveTextContent(/not scanner output/i);
    expect(banner).toHaveTextContent(/not live monitoring/i);
  });

  it('marks every finding row as Simulated in preview', async () => {
    stubOffline();
    renderApp('/threats');
    const rows = await screen.findAllByTestId('finding-row');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(within(row).getByText('Simulated')).toBeInTheDocument();
      expect(within(row).queryByText('Observed')).not.toBeInTheDocument();
    }
  });

  it('does not show the preview banner when using the backend API source', async () => {
    stubOffline();
    renderApp('/', 'api');
    await screen.findByRole('heading', { level: 1, name: 'Security Command Center' });
    expect(screen.queryByTestId('preview-banner')).not.toBeInTheDocument();
  });
});

describe('backend connection indicator reflects the real health result', () => {
  it('shows Connecting before the first response, then online on a healthy answer', async () => {
    let release: (r: Response) => void = () => {};
    stubFetch(() => new Promise<Response>((res) => (release = res)));
    renderApp('/');
    expect(screen.getByTestId('backend-status')).toHaveAttribute('data-status', 'connecting');
    expect(screen.getByTestId('backend-status')).not.toHaveTextContent('online');
    release(json(HEALTHY));
    await waitFor(() => expect(screen.getByTestId('backend-status')).toHaveAttribute('data-status', 'online'));
    expect(screen.getByTestId('backend-status')).toHaveTextContent('Backend online');
  });

  it('shows unavailable (never "online") when the backend is down', async () => {
    stubOffline();
    renderApp('/');
    await waitFor(() => expect(screen.getByTestId('backend-status')).toHaveAttribute('data-status', 'offline'));
    expect(screen.getByTestId('backend-status')).toHaveTextContent('Backend unavailable');
    expect(screen.getByTestId('backend-status')).not.toHaveTextContent('Backend online');
  });

  it('treats a 404 health route as unavailable, not online', async () => {
    stubFetch(() => json({}, 404));
    renderApp('/');
    await waitFor(() => expect(screen.getByTestId('backend-status')).toHaveAttribute('data-status', 'offline'));
  });

  it('treats a 200 with a non-health body as unavailable', async () => {
    stubFetch(() => json({ hello: 'world' }));
    renderApp('/');
    await waitFor(() => expect(screen.getByTestId('backend-status')).toHaveAttribute('data-status', 'offline'));
  });
});

describe('API failures produce visible, safe error states', () => {
  it('shows an error with retry (not a blank page or endless spinner) when the API is down', async () => {
    stubOffline();
    renderApp('/threats', 'api');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Backend unreachable');
    expect(within(alert).getByRole('button', { name: /Retry/ })).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
  });

  it('says "not available yet" for unimplemented endpoints', async () => {
    stubFetch((url) => (url.endsWith('/health') ? json(HEALTHY) : json({}, 404)));
    renderApp('/paths', 'api');
    expect(await screen.findByText('Not available on the backend yet')).toBeInTheDocument();
  });

  it('never renders server error bodies or stack traces', async () => {
    stubFetch(() => json({ detail: 'Traceback: sk-live-SECRET-9999' }, 500));
    renderApp('/threats', 'api');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Request failed');
    expect(document.body).not.toHaveTextContent('SECRET-9999');
    expect(document.body).not.toHaveTextContent('Traceback');
  });

  it('shows an honest empty state when the backend returns no findings', async () => {
    stubFetch((url) => (url.endsWith('/health') ? json(HEALTHY) : json([])));
    renderApp('/threats', 'api');
    expect(await screen.findByText('No findings reported')).toBeInTheDocument();
  });

  it('retries and recovers when the backend comes back', async () => {
    let up = false;
    stubFetch((url) => {
      if (url.endsWith('/health')) return json(HEALTHY);
      if (!up) throw new TypeError('Failed to fetch');
      return url.includes('/findings') ? json([]) : json([]);
    });
    const user = userEvent.setup();
    renderApp('/threats', 'api');
    await screen.findByRole('alert');
    up = true;
    await user.click(screen.getByRole('button', { name: /Retry/ }));
    expect(await screen.findByText('No findings reported')).toBeInTheDocument();
  });
});

describe('demo reset never shows false success', () => {
  it('shows an error and NO success when the backend is unreachable', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/');
    await user.click(await screen.findByRole('button', { name: /Reset demo scenario/ }));
    const feedback = await screen.findByTestId('reset-feedback');
    expect(feedback).toHaveAttribute('data-phase', 'error');
    expect(feedback).toHaveTextContent(/nothing was reset/i);
    expect(feedback).not.toHaveTextContent(/confirmed/i);
  });

  it('shows "not available yet" when the reset endpoint is not implemented (404)', async () => {
    stubFetch((_url, init) => (init?.method === 'POST' ? json({}, 404) : json(HEALTHY)));
    const user = userEvent.setup();
    renderApp('/');
    await user.click(await screen.findByRole('button', { name: /Reset demo scenario/ }));
    const feedback = await screen.findByTestId('reset-feedback');
    expect(feedback).toHaveAttribute('data-phase', 'error');
    expect(feedback).toHaveTextContent(/not available on the backend yet/i);
  });

  it('shows an error for a 2xx reply that is not a valid reset response', async () => {
    stubFetch((_url, init) => (init?.method === 'POST' ? json({ ok: true }) : json(HEALTHY)));
    const user = userEvent.setup();
    renderApp('/');
    await user.click(await screen.findByRole('button', { name: /Reset demo scenario/ }));
    expect(await screen.findByTestId('reset-feedback')).toHaveAttribute('data-phase', 'error');
  });

  it('shows success only after the backend returns a valid 2xx reset response', async () => {
    const run = {
      id: 'run-demo-reset',
      mode: 'DEMO_MODE',
      status: 'completed',
      currentStepMessage: 'Demo scenario reset to canonical baseline.',
    };
    stubFetch((_url, init) => (init?.method === 'POST' ? json(run) : json(HEALTHY)));
    const user = userEvent.setup();
    renderApp('/');
    expect(screen.queryByTestId('reset-feedback')).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /Reset demo scenario/ }));
    const feedback = await screen.findByTestId('reset-feedback');
    expect(feedback).toHaveAttribute('data-phase', 'success');
    expect(feedback).toHaveTextContent('Backend confirmed the reset');
  });

  it('disables the button and shows progress while the reset is in flight', async () => {
    let release: (r: Response) => void = () => {};
    stubFetch((_url, init) => (init?.method === 'POST' ? new Promise<Response>((res) => (release = res)) : json(HEALTHY)));
    const user = userEvent.setup();
    renderApp('/');
    const button = await screen.findByRole('button', { name: /Reset demo scenario/ });
    await user.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    expect(button).toHaveTextContent('Resetting');
    expect(screen.queryByTestId('reset-feedback')).not.toBeInTheDocument();
    release(json({ id: 'x', mode: 'DEMO_MODE', status: 'completed', currentStepMessage: 'ok' }));
    await waitFor(() => expect(button).toBeEnabled());
  });
});

describe('finding evidence and remediation honesty', () => {
  it('opens a finding drawer that states the evidence is simulated', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/threats');
    const rows = await screen.findAllByTestId('finding-row');
    await user.click(within(rows[0]).getByRole('button'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Simulated evidence.')).toBeInTheDocument();
    expect(within(dialog).getByText(/not be read as a real scan result/i)).toBeInTheDocument();
    // secrets are masked in the excerpt
    expect(dialog).not.toHaveTextContent('wJalrXUtnFEMI');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('filters findings by search text', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/threats');
    expect(await screen.findAllByTestId('finding-row')).toHaveLength(2);
    await user.type(screen.getByRole('searchbox', { name: 'Search findings' }), 'wildcard');
    expect(screen.getAllByTestId('finding-row')).toHaveLength(1);
    await user.clear(screen.getByRole('searchbox', { name: 'Search findings' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search findings' }), 'zzzz-no-match');
    expect(await screen.findByText('No findings match these filters')).toBeInTheDocument();
  });

  it('labels the attack path as inferred and not a confirmed exploit', async () => {
    stubOffline();
    renderApp('/paths');
    expect(await screen.findByText(/Inferred potential path, not a confirmed exploit/)).toBeInTheDocument();
    expect(screen.getAllByTestId('path-step')).toHaveLength(3);
  });

  it('distinguishes inferred from verified relationships in the graph', async () => {
    stubOffline();
    renderApp('/graph');
    const canvas = await screen.findByTestId('graph-canvas');
    const inferred = canvas.querySelectorAll('[data-inferred="true"]');
    const verified = canvas.querySelectorAll('[data-inferred="false"]');
    expect(inferred.length).toBe(2);
    expect(verified.length).toBe(2);
    expect(screen.getByRole('list', { name: 'Graph legend' })).toHaveTextContent('Inferred relationship');
  });

  it('highlights the potential path only on request and states it is not a confirmed exploit', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/graph');
    const canvas = await screen.findByTestId('graph-canvas');
    expect(screen.queryByText(/Potential path, not a confirmed exploit/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Highlight potential path/ }));
    expect(await screen.findByText(/Potential path, not a confirmed exploit/)).toBeInTheDocument();
    // the two hops between consecutive path assets are highlighted; finding attachments are not
    expect(canvas.querySelectorAll('[data-edge-id="rel-01"], [data-edge-id="rel-02"]')).toHaveLength(2);
  });

  it('shows the selected node details when a graph node is chosen', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/graph');
    await user.click(await screen.findByRole('button', { name: /Asset: saas-core-api/ }));
    const inspector = await screen.findByTestId('node-inspector');
    expect(inspector).toHaveTextContent('saas-core-api');
    expect(inspector).toHaveTextContent('Repository');
  });

  it('preview approval sends nothing, applies nothing and shows no verified success', async () => {
    const fetchMock = stubOffline();
    const user = userEvent.setup();
    renderApp('/remediation');
    await screen.findByRole('form', { name: 'Human approval' });
    const submit = screen.getByRole('button', { name: /Preview approval/ });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText('Approver'), 'dev-b');
    await user.click(screen.getByLabelText(/I have reviewed the proposed patch/));
    await user.click(submit);

    expect(await screen.findByTestId('approval-preview-notice')).toHaveTextContent(/No request was sent and no remediation was applied/);
    expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === 'POST')).toBe(false);
    expect(screen.queryByTestId('verification-success')).not.toBeInTheDocument();
    expect(screen.getByTestId('verification-pending')).toBeInTheDocument();
    expect(screen.getAllByText('Awaiting approval').length).toBeGreaterThan(0);
  });

  it('shows verified success only for a backend-reported applied + passed remediation', async () => {
    const remediation = (patch: object) => [
      {
        id: 'rem-x',
        findingId: 'find-sec-01',
        title: 'Fix',
        description: 'desc',
        requiresApproval: true,
        status: 'PENDING',
        createdAt: '2026-11-14T10:12:00Z',
        ...patch,
      },
    ];
    const serve = (rem: unknown) =>
      stubFetch((url) => {
        if (url.endsWith('/health')) return json(HEALTHY);
        if (url.endsWith('/remediations')) return json(rem);
        return json([]);
      });

    serve(remediation({ status: 'APPROVED', verificationStatus: 'PASSED' }));
    const first = renderApp('/remediation', 'api');
    await screen.findByRole('heading', { name: 'Fix' });
    expect(screen.queryByTestId('verification-success')).not.toBeInTheDocument();
    first.unmount();

    serve(remediation({ status: 'APPLIED', verificationStatus: 'PASSED' }));
    renderApp('/remediation', 'api');
    expect(await screen.findByTestId('verification-success')).toHaveTextContent('Verified remediated');
  });
});
