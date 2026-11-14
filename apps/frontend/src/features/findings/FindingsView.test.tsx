import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { SecurityFinding } from '@/types';
import { HEALTHY, json, renderApp, stubFetch, stubOffline } from '@/test/utils';
import { makeFinding } from './triage.test';

const rowIds = () => screen.queryAllByTestId('finding-row').map((r) => r.getAttribute('data-finding-id'));
const count = () => screen.getByTestId('result-count').textContent;

/** Backend with the given findings and an asset inventory; everything else is empty. */
function serve(findings: SecurityFinding[], opts: { failFindings?: boolean } = {}) {
  const assets = [
    { id: 'asset-repo-01', name: 'saas-core-api', type: 'REPOSITORY', environment: 'PRODUCTION', criticality: 'CRITICAL', owner: 'Eng', createdAt: 't', updatedAt: 't' },
    { id: 'asset-cloud-01', name: 'aws-production-account', type: 'CLOUD_ACCOUNT', environment: 'PRODUCTION', criticality: 'HIGH', owner: 'Ops', createdAt: 't', updatedAt: 't' },
  ];
  return stubFetch((url) => {
    if (url.endsWith('/health')) return json(HEALTHY);
    if (url.includes('/findings')) return opts.failFindings ? json({}, 500) : json(findings);
    if (url.endsWith('/assets')) return json(assets);
    return json([]);
  });
}

const API_SET: SecurityFinding[] = [
  makeFinding({ id: 'live-1', title: 'Live critical secret', severity: 'CRITICAL', scanner: 'gitleaks', assetId: 'asset-repo-01', provenance: 'OBSERVED', location: { file: 'src/.env', line: 3 } }),
  makeFinding({ id: 'live-2', title: 'Live high IaC', severity: 'HIGH', scanner: 'checkov', assetId: 'asset-cloud-01', provenance: 'OBSERVED', status: 'IN_REMEDIATION' }),
  makeFinding({ id: 'live-3', title: 'Live low dependency', severity: 'LOW', scanner: 'trivy', assetId: 'asset-repo-01', provenance: 'INFERRED', cveId: 'CVE-2099-0001', cvssScore: 3.1 }),
];

describe('TSK-016: findings table (preview data)', () => {
  it('renders every documented finding with severity, category, asset, source, status, provenance and time', async () => {
    stubOffline();
    renderApp('/threats');
    const rows = await screen.findAllByTestId('finding-row');
    expect(rows).toHaveLength(2);
    const first = within(rows[0]);
    expect(first.getByText('Critical')).toBeInTheDocument();
    expect(first.getByText('Secret')).toBeInTheDocument();
    expect(first.getByText('saas-core-api')).toBeInTheDocument();
    expect(first.getByText('gitleaks')).toBeInTheDocument();
    expect(first.getByText('Open')).toBeInTheDocument();
    expect(first.getByText('Simulated demo')).toBeInTheDocument();
    expect(first.getByText(/14 Nov, 10:05 UTC/)).toBeInTheDocument();
    expect(first.getByText('config/staging.env:14')).toBeInTheDocument();
  });

  it('has the documented columns, and the sortable ones expose aria-sort', async () => {
    stubOffline();
    renderApp('/threats');
    await screen.findAllByTestId('finding-row');
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim());
    expect(headers).toEqual(['Severity', 'Finding', 'Category', 'Asset', 'Source', 'Status', 'Provenance', 'Discovered']);
    expect(screen.getByRole('columnheader', { name: /Severity/ })).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByRole('columnheader', { name: /Finding/ })).toHaveAttribute('aria-sort', 'none');
  });

  it('marks every row Simulated demo and none Observed', async () => {
    stubOffline();
    renderApp('/threats');
    for (const row of await screen.findAllByTestId('finding-row')) {
      expect(within(row).getByText('Simulated demo')).toBeInTheDocument();
      expect(within(row).queryByText('Observed')).not.toBeInTheDocument();
    }
  });

  it('sorts when a header is activated and flips direction on a second click', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/threats');
    await screen.findAllByTestId('finding-row');
    expect(rowIds()).toEqual(['find-sec-01', 'find-iac-01']); // severity desc

    await user.click(screen.getByRole('button', { name: /^Severity/ }));
    expect(rowIds()).toEqual(['find-iac-01', 'find-sec-01']);
    expect(screen.getByRole('columnheader', { name: /Severity/ })).toHaveAttribute('aria-sort', 'ascending');

    await user.click(screen.getByRole('button', { name: /^Finding/ }));
    expect(rowIds()).toEqual(['find-sec-01', 'find-iac-01']); // "Committed..." < "Overprivileged..."
    await user.click(screen.getByRole('button', { name: /^Finding/ }));
    expect(rowIds()).toEqual(['find-iac-01', 'find-sec-01']);
  });

  it('filters by search text, and Clear search restores the rows', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/threats');
    await screen.findAllByTestId('finding-row');
    await user.type(screen.getByRole('searchbox', { name: 'Search findings' }), 'wildcard');
    expect(rowIds()).toEqual(['find-iac-01']);
    expect(count()).toBe('1 of 2 findings');
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(rowIds()).toHaveLength(2);
  });

  it('category tabs filter the visible rows (they are not cosmetic)', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/threats');
    await screen.findAllByTestId('finding-row');
    const tabs = within(screen.getByRole('tablist', { name: 'Finding category' }));
    expect(tabs.getByRole('tab', { name: /All\s*2/ })).toHaveAttribute('aria-selected', 'true');
    expect(tabs.queryByRole('tab', { name: /Vulnerability/ })).not.toBeInTheDocument(); // empty categories are hidden

    await user.click(tabs.getByRole('tab', { name: /IaC/ }));
    expect(rowIds()).toEqual(['find-iac-01']);
    await user.click(tabs.getByRole('tab', { name: /Secret/ }));
    expect(rowIds()).toEqual(['find-sec-01']);
    await user.click(tabs.getByRole('tab', { name: /All/ }));
    expect(rowIds()).toHaveLength(2);
  });

  it('severity strip filters and toggles off', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/threats');
    await screen.findAllByTestId('finding-row');
    const strip = within(screen.getByRole('group', { name: 'Filter by severity' }));
    await user.click(strip.getByRole('button', { name: /High/ }));
    expect(rowIds()).toEqual(['find-iac-01']);
    expect(strip.getByRole('button', { name: /High/ })).toHaveAttribute('aria-pressed', 'true');
    await user.click(strip.getByRole('button', { name: /High/ }));
    expect(rowIds()).toHaveLength(2);
  });

  it('scanner, asset, status and provenance dropdowns each change the visible rows', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/threats');
    await screen.findAllByTestId('finding-row');

    await user.selectOptions(screen.getByLabelText('Scanner'), 'checkov');
    expect(rowIds()).toEqual(['find-iac-01']);
    await user.selectOptions(screen.getByLabelText('Scanner'), 'ALL');

    await user.selectOptions(screen.getByLabelText('Asset'), 'asset-repo-01');
    expect(rowIds()).toEqual(['find-sec-01']);
    await user.selectOptions(screen.getByLabelText('Asset'), 'ALL');

    await user.selectOptions(screen.getByLabelText('Status'), 'RESOLVED');
    expect(rowIds()).toEqual([]);
    expect(await screen.findByText('No findings match these filters')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Status'), 'ALL');

    await user.selectOptions(screen.getByLabelText('Provenance'), 'OBSERVED');
    expect(rowIds()).toEqual([]); // preview data is never observed
    await user.selectOptions(screen.getByLabelText('Provenance'), 'SIMULATED');
    expect(rowIds()).toHaveLength(2);
  });

  it('shows removable chips for active filters and a working Clear all', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/threats');
    await screen.findAllByTestId('finding-row');
    await user.selectOptions(screen.getByLabelText('Scanner'), 'checkov');
    await user.type(screen.getByRole('searchbox', { name: 'Search findings' }), 'iam');
    expect(screen.getByRole('button', { name: /Remove filter Scanner: checkov/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove filter Search: "iam"/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Remove filter Scanner: checkov/ }));
    expect(screen.queryByRole('button', { name: /Remove filter Scanner/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(rowIds()).toHaveLength(2);
    expect((screen.getByRole('searchbox', { name: 'Search findings' }) as HTMLInputElement).value).toBe('');
  });

  it('the result count is announced politely', async () => {
    stubOffline();
    renderApp('/threats');
    await screen.findAllByTestId('finding-row');
    expect(screen.getByTestId('result-count')).toHaveAttribute('aria-live', 'polite');
    expect(count()).toBe('2 of 2 findings');
  });
});

describe('TSK-016: URL state', () => {
  it('restores filters, sort and the open finding from the URL', async () => {
    stubOffline();
    renderApp('/threats?severity=HIGH&sort=title&dir=asc&f=find-iac-01');
    expect(await screen.findAllByTestId('finding-row')).toHaveLength(1);
    expect(rowIds()).toEqual(['find-iac-01']);
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Overprivileged IAM Role Allows S3 Wildcard Admin');
    expect(screen.getByRole('columnheader', { name: /Finding/ })).toHaveAttribute('aria-sort', 'ascending');
  });

  it('ignores a malformed URL instead of crashing', async () => {
    stubOffline();
    renderApp('/threats?severity=EXTREME&sort=bogus&category=%3Cscript%3E&dir=up');
    expect(await screen.findAllByTestId('finding-row')).toHaveLength(2);
  });

  it('says so when a shared link points at a finding that is not in this data source', async () => {
    stubOffline();
    renderApp('/threats?f=live-only-finding');
    expect(await screen.findByText(/was not found in the local preview data/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('TSK-016: detail drawer', () => {
  it('opens on row click, shows the grounded fields and closes on Escape', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/threats');
    await user.click(within((await screen.findAllByTestId('finding-row'))[0]).getByRole('button'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Simulated evidence.')).toBeInTheDocument();
    expect(within(dialog).getByText('9.8')).toBeInTheDocument(); // CVSS present in the scenario
    expect(within(dialog).getByText('None provided')).toBeInTheDocument(); // CVE absent: never invented
    expect(within(dialog).getByText('Revoke compromised IAM key immediately and inject secrets via environment vault.')).toBeInTheDocument();
    expect(within(dialog).getByText('config/staging.env:14')).toBeInTheDocument();
    expect(dialog).not.toHaveTextContent('wJalrXUtnFEMI');
    expect(dialog).not.toHaveTextContent('AKIAIOSFODNN7EXAMPLE');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the URL in sync so reload reopens it, and closing removes it', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/threats');
    await user.click(within((await screen.findAllByTestId('finding-row'))[0]).getByRole('button'));
    await screen.findByRole('dialog');
    expect(screen.getByRole('row', { selected: true })).toHaveAttribute('data-finding-id', 'find-sec-01');
    // two controls carry this name: the backdrop and the header X. Use the X inside the dialog.
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close details' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('row', { selected: true })).not.toBeInTheDocument();
  });

  it('navigates previous / next within the visible list, wrapping, and with j / k', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/threats?f=find-sec-01');
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Finding 1 of 2/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Next finding' }));
    expect(await screen.findByText(/Finding 2 of 2/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Overprivileged IAM Role Allows S3 Wildcard Admin');
    await user.click(screen.getByRole('button', { name: 'Next finding' })); // wraps
    expect(await screen.findByText(/Finding 1 of 2/)).toBeInTheDocument();
    await user.keyboard('j');
    expect(await screen.findByText(/Finding 2 of 2/)).toBeInTheDocument();
    await user.keyboard('k');
    expect(await screen.findByText(/Finding 1 of 2/)).toBeInTheDocument();
  });

  it('navigation respects the active filter (only filtered findings are reachable)', async () => {
    stubOffline();
    renderApp('/threats?severity=HIGH&f=find-iac-01');
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Finding 1 of 1/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Next finding' })).toBeDisabled();
  });
});

describe('TSK-016: API mode never silently uses preview data', () => {
  it('shows the backend findings, not the fixtures, and no preview banner', async () => {
    serve(API_SET);
    renderApp('/threats', 'api');
    const rows = await screen.findAllByTestId('finding-row');
    expect(rows).toHaveLength(3);
    expect(rowIds()).toEqual(['live-1', 'live-2', 'live-3']);
    expect(screen.queryByText('Committed AWS IAM Secret Key in Staging Config')).not.toBeInTheDocument();
    expect(screen.queryByTestId('preview-banner')).not.toBeInTheDocument();
    expect(screen.getByText('Backend data')).toBeInTheDocument();
  });

  it('labels observed and inferred findings distinctly (never as simulated)', async () => {
    serve(API_SET);
    renderApp('/threats', 'api');
    const rows = await screen.findAllByTestId('finding-row');
    expect(within(rows[0]).getByText('Observed')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Inferred')).toBeInTheDocument();
    for (const row of rows) expect(within(row).queryByText(/Simulated/)).not.toBeInTheDocument();
  });

  it('shows CVE and CVSS only when the backend supplied them', async () => {
    serve(API_SET);
    const user = userEvent.setup();
    renderApp('/threats?f=live-3', 'api');
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('CVE-2099-0001')).toBeInTheDocument();
    expect(within(dialog).getByText('3.1')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(within((await screen.findAllByTestId('finding-row'))[0]).getByRole('button'));
    const second = await screen.findByRole('dialog');
    expect(within(second).getByText('Not provided')).toBeInTheDocument();
    expect(within(second).getByText('None provided')).toBeInTheDocument();
  });

  it('on a failed request shows an error with retry and does NOT fall back to the fixtures', async () => {
    serve(API_SET, { failFindings: true });
    renderApp('/threats', 'api');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Request failed');
    expect(within(alert).getByRole('button', { name: /Retry/ })).toBeInTheDocument();
    expect(rowIds()).toEqual([]);
    expect(screen.queryByText('Committed AWS IAM Secret Key in Staging Config')).not.toBeInTheDocument();
  });

  it('on an unreachable backend shows the offline error, not fixtures', async () => {
    stubOffline();
    renderApp('/threats', 'api');
    expect(await screen.findByRole('alert')).toHaveTextContent('Backend unreachable');
    expect(rowIds()).toEqual([]);
  });

  it('shows an honest empty state for an empty backend result', async () => {
    serve([]);
    renderApp('/threats', 'api');
    expect(await screen.findByText('No findings reported')).toBeInTheDocument();
    expect(screen.getByText(/The backend returned no findings/)).toBeInTheDocument();
  });

  it('shows a loading skeleton, then content (never an endless spinner)', async () => {
    let release: (r: Response) => void = () => {};
    stubFetch((url) => {
      if (url.endsWith('/health')) return json(HEALTHY);
      if (url.includes('/findings')) return new Promise<Response>((res) => (release = res));
      return json([]);
    });
    renderApp('/threats', 'api');
    // the loading skeleton is a live region labelled for assistive tech
    expect(await screen.findByText('Loading findings...')).toBeInTheDocument();
    expect(rowIds()).toEqual([]);
    release(json(API_SET));
    expect(await screen.findAllByTestId('finding-row')).toHaveLength(3);
  });

  it('maps an unmapped scanner to the Other category without inventing a label', async () => {
    serve([makeFinding({ id: 'x1', scanner: 'brand-new-scanner', provenance: 'OBSERVED' })]);
    renderApp('/threats', 'api');
    const row = (await screen.findAllByTestId('finding-row'))[0];
    expect(within(row).getByText('Other')).toBeInTheDocument();
    expect(within(row).getByText('brand-new-scanner')).toBeInTheDocument();
  });

  it('category tab counts reflect the other active filters', async () => {
    serve(API_SET);
    const user = userEvent.setup();
    renderApp('/threats', 'api');
    await screen.findAllByTestId('finding-row');
    const tabs = within(screen.getByRole('tablist', { name: 'Finding category' }));
    expect(tabs.getByRole('tab', { name: /Secret\s*1/ })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Status'), 'IN_REMEDIATION');
    expect(tabs.getByRole('tab', { name: /IaC\s*1/ })).toBeInTheDocument();
    expect(tabs.queryByRole('tab', { name: /Secret/ })).not.toBeInTheDocument();
  });
});
