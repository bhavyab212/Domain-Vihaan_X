import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, FileDiff, Lightbulb, SearchX, TriangleAlert, Wrench } from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { DiffViewer } from '@/components/common/DiffViewer';
import { PageHeader } from '@/components/common/PageHeader';
import { ProvenanceBadge } from '@/components/common/ProvenanceBadge';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { EmptyState } from '@/components/common/States';
import { Badge } from '@/components/ui/Badge';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { useDataSource } from '@/app/providers/DataSourceProvider';
import { useSourceData } from '@/hooks/useSourceData';
import { cn } from '@/lib/utils/cn';
import { formatUtc, indexById } from '@/lib/utils/format';
import { parseIdParam } from '@/lib/utils/params';
import type { DataOrigin, DigitalAsset, RemediationAction, SecurityFinding } from '@/types';
import { ApprovalPanel } from './ApprovalPanel';
import { LifecycleStepper } from './LifecycleStepper';
import { isVerifiedSuccess, outcomeOf, type Outcome } from './lifecycle';
import { backendStateLabel, diffStats, filesFromDiff, placeholdersIn } from './remediationModel';

interface RemediationBundle {
  remediations: RemediationAction[];
  findings: SecurityFinding[];
  assets: DigitalAsset[];
}

const OUTCOME_BADGE: Record<Outcome, { label: string; tone: 'neutral' | 'signal' | 'ok' | 'warn' | 'critical' }> = {
  'awaiting-approval': { label: 'Awaiting approval', tone: 'warn' },
  approved: { label: 'Approved, not applied', tone: 'signal' },
  'applied-unverified': { label: 'Applied, unverified', tone: 'signal' },
  verified: { label: 'Verified', tone: 'ok' },
  'verification-failed': { label: 'Verification failed', tone: 'critical' },
  failed: { label: 'Failed', tone: 'critical' },
  rejected: { label: 'Rejected', tone: 'neutral' },
};

function OutcomeBadge({ remediation }: { remediation: RemediationAction }) {
  const { label, tone } = OUTCOME_BADGE[outcomeOf(remediation)];
  return <Badge tone={tone}>{label}</Badge>;
}

/**
 * Green success appears here and ONLY here, and only for a backend-reported verified result (status APPLIED and
 * verificationStatus PASSED).
 *
 * What is NOT shown, deliberately: a reassessment id, a before/after scanner comparison, a verification timestamp or
 * evidence. RemediationAction in the contract carries none of them, so there is nothing true to display. They appear
 * only if the contract grows those fields; until then the panel says so instead of implying they exist.
 */
function VerificationResult({ remediation }: { remediation: RemediationAction }) {
  const outcome = outcomeOf(remediation);
  let body: React.ReactNode;

  if (isVerifiedSuccess(remediation)) {
    body = (
      <div role="status" data-testid="verification-success" className="flex gap-3 rounded-md border border-ok/40 bg-ok/10 px-4 py-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden />
        <div className="text-sm leading-relaxed text-fg-soft">
          <p className="font-semibold text-ok">Verified remediated</p>
          <p className="mt-0.5">The backend reports this remediation as applied and its re-assessment as passed.</p>
        </div>
      </div>
    );
  } else if (outcome === 'verification-failed' || outcome === 'failed') {
    body = (
      <div role="alert" className="flex gap-3 rounded-md border border-sev-critical/40 bg-sev-critical/10 px-4 py-3">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-sev-critical" aria-hidden />
        <p className="text-sm leading-relaxed text-fg-soft">
          <span className="font-semibold text-sev-critical">Not verified.</span>{' '}
          {outcome === 'failed' ? 'The backend reports that applying this change failed.' : 'The re-assessment did not pass, so the risk may remain.'}
        </p>
      </div>
    );
  } else {
    body = (
      <p data-testid="verification-pending" className="rounded-md border border-line bg-ink-900 px-4 py-3 text-sm leading-relaxed text-fg-muted">
        <span className="font-medium text-fg-soft">No verified result.</span> Success is shown only when the backend reports a completed, verified
        remediation. Nothing has been verified yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {body}
      <dl className="divide-y divide-line border-y border-line text-xs">
        <div className="flex justify-between gap-4 py-2">
          <dt className="text-fg-muted">Backend state</dt>
          <dd><code className="font-mono text-fg" data-testid="backend-state">{backendStateLabel(remediation)}</code></dd>
        </div>
        <div className="flex justify-between gap-4 py-2">
          <dt className="text-fg-muted">Re-assessment evidence</dt>
          <dd className="text-right text-fg-muted">Not provided by the backend contract</dd>
        </div>
      </dl>
    </div>
  );
}

function ProposalFacts({ remediation }: { remediation: RemediationAction }) {
  const files = filesFromDiff(remediation.patchDiff);
  const stats = diffStats(remediation.patchDiff);
  const placeholders = placeholdersIn(remediation.patchDiff);
  return (
    <div className="space-y-3">
      <dl className="divide-y divide-line border-y border-line text-xs">
        <div className="flex justify-between gap-4 py-2">
          <dt className="shrink-0 text-fg-muted">Scope</dt>
          <dd className="min-w-0 break-words text-right text-fg" data-testid="scope">{files.length > 0 ? files.join(', ') : 'No file paths in the patch'}</dd>
        </div>
        <div className="flex justify-between gap-4 py-2">
          <dt className="text-fg-muted">Change size</dt>
          <dd className="tabular text-fg">+{stats.added} / −{stats.removed} lines</dd>
        </div>
        <div className="flex justify-between gap-4 py-2">
          <dt className="text-fg-muted">Human review</dt>
          <dd className="text-fg">{remediation.requiresApproval ? 'Required before any change' : 'Not required by the backend'}</dd>
        </div>
        <div className="flex justify-between gap-4 py-2">
          <dt className="text-fg-muted">Proposed</dt>
          <dd className="text-fg">{formatUtc(remediation.createdAt)}</dd>
        </div>
        {remediation.attackPathId && (
          <div className="flex justify-between gap-4 py-2">
            <dt className="text-fg-muted">Attack path</dt>
            <dd><Link to={`/paths?p=${encodeURIComponent(remediation.attackPathId)}`} className="font-medium text-signal underline underline-offset-2">Investigate</Link></dd>
          </div>
        )}
      </dl>
      {placeholders.length > 0 && (
        <p role="note" data-testid="placeholders" className="flex gap-2 rounded-md border border-sev-high/30 bg-sev-high/10 px-3 py-2 text-xs leading-relaxed text-sev-high">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Needs a person to complete: <span className="font-mono">{placeholders.join(', ')}</span>. This patch is not applicable as written.
          </span>
        </p>
      )}
      {remediation.shellScript && (
        <p className="text-xs leading-relaxed text-fg-muted">
          The backend also supplied a shell script. It is not displayed or run here: scripts execute only through the backend's approved pipeline.
        </p>
      )}
    </div>
  );
}

function Detail({
  remediation,
  finding,
  asset,
  origin,
  onApproved,
}: {
  remediation: RemediationAction;
  finding: SecurityFinding | undefined;
  asset: DigitalAsset | undefined;
  origin: DataOrigin;
  onApproved: (r: RemediationAction) => void;
}) {
  return (
    <div className="space-y-4">
      <Panel aria-labelledby="rem-title">
        <PanelHeader
          id="rem-title"
          title={remediation.title}
          description={finding ? `For finding: ${finding.title}` : `Finding ${remediation.findingId}`}
          action={<OutcomeBadge remediation={remediation} />}
        />
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
            {finding && <SeverityBadge severity={finding.severity} />}
            {finding && <ProvenanceBadge provenance={finding.provenance} />}
            {asset && <span>Asset: <span className="text-fg-soft">{asset.name}</span></span>}
            {finding ? (
              <Link to={`/threats?f=${encodeURIComponent(finding.id)}`} className="font-medium text-signal underline underline-offset-2">View finding</Link>
            ) : (
              <span className="text-fg-faint">Finding not in the loaded list</span>
            )}
          </div>
          <div className="flex gap-2.5">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
            <div>
              <h3 className="text-2xs uppercase text-fg-muted">Recommended fix</h3>
              <p className="mt-1 text-sm leading-relaxed text-fg-soft">{remediation.description}</p>
            </div>
          </div>
          <ProposalFacts remediation={remediation} />
        </div>
      </Panel>

      <Panel aria-labelledby="diff-title">
        <PanelHeader id="diff-title" title="Proposed change" description="Review the exact patch before approving. Nothing is applied by viewing it." />
        <div className="space-y-3 p-4">
          {remediation.patchDiff ? (
            <DiffViewer diff={remediation.patchDiff} />
          ) : (
            <EmptyState icon={<FileDiff className="h-6 w-6" aria-hidden />} title="No patch supplied" description="The backend did not include a code diff for this remediation." />
          )}
          {origin === 'SIMULATED_DEMO' && remediation.patchDiff && (
            <p className="text-xs leading-relaxed text-sim">Illustrative diff for the synthetic scenario. Secrets are masked and placeholders must be completed by a person.</p>
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Panel aria-labelledby="risk-title">
          <PanelHeader id="risk-title" title="Risk reduction" description="What this change is intended to do" />
          <div className="space-y-2 p-4 text-sm leading-relaxed text-fg-soft">
            <p>{finding?.remediationGuidance ?? 'No remediation guidance was supplied with this finding.'}</p>
            <p className="text-xs text-fg-muted">
              This describes the intent of the change. Actual risk reduction is established only by a verified re-assessment, and no score is estimated here.
            </p>
          </div>
        </Panel>

        <Panel aria-labelledby="approval-title">
          <PanelHeader id="approval-title" title="Human approval" description="Required before any change (ADR-007)" />
          <div className="p-4">
            <ApprovalPanel key={remediation.id} remediation={remediation} origin={origin} onApproved={onApproved} />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Panel aria-labelledby="exec-title">
          <PanelHeader id="exec-title" title="Execution state" description="As reported by the backend" />
          <div className="space-y-3 p-4">
            <LifecycleStepper remediation={remediation} />
            {/* No execute endpoint exists in the contract, so no Execute control is offered: it could only fake progress. */}
            <p data-testid="execution-unavailable" className="border-t border-line pt-3 text-xs leading-relaxed text-fg-muted">
              Applying a change is done by the backend, not from this page. The backend contract defines no execute operation yet, so there is no
              Execute button, and “Applied” appears only if the backend reports it.
            </p>
          </div>
        </Panel>
        <Panel aria-labelledby="verify-title">
          <PanelHeader id="verify-title" title="Verification result" />
          <div className="p-4">
            <VerificationResult remediation={remediation} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function RemediationWorkspace({ bundle }: { bundle: RemediationBundle }) {
  const { source } = useDataSource();
  const { findings, assets } = bundle;
  const [params, setParams] = useSearchParams();
  const requestedId = parseIdParam(params.get('r'));
  const [overrides, setOverrides] = useState<Record<string, RemediationAction>>({});

  const remediations = useMemo(() => bundle.remediations.map((r) => overrides[r.id] ?? r), [bundle.remediations, overrides]);
  const findingIndex = useMemo(() => indexById(findings), [findings]);
  const assetIndex = useMemo(() => indexById(assets), [assets]);

  // Selecting replaces the history entry: switching between queue items should not fill the Back stack.
  const select = useCallback(
    (id: string) => setParams((prev) => { const next = new URLSearchParams(prev); next.set('r', id); return next; }, { replace: true }),
    [setParams],
  );

  if (remediations.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon={<Wrench className="h-7 w-7" aria-hidden />}
          title="No remediations proposed"
          description="The data source has not proposed any fixes. Remediations appear here once findings have recommended changes."
        />
      </Panel>
    );
  }

  const requested = requestedId ? remediations.find((r) => r.id === requestedId) : undefined;
  const active = requested ?? remediations[0];
  const finding = findingIndex[active.findingId];

  return (
    <div className="space-y-4">
      {requestedId && !requested && (
        <div role="status" data-testid="remediation-not-found" className="flex items-start gap-3 rounded-md border border-line-strong bg-ink-900 px-4 py-3 text-sm text-fg-soft">
          <SearchX className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
          <p>
            No remediation <code className="font-mono text-fg">{requestedId}</code> exists in the current data source, so the first one is shown instead. It may belong
            to the other source (preview or backend).
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Panel aria-labelledby="queue-title" className="self-start">
          <PanelHeader id="queue-title" title="Remediation queue" description={`${remediations.length} proposed`} />
          <ul className="divide-y divide-line" role="listbox" aria-label="Remediations">
            {remediations.map((r) => {
              const f = findingIndex[r.findingId];
              const selected = r.id === active.id;
              return (
                <li key={r.id} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => select(r.id)}
                    className={cn('w-full space-y-1.5 px-4 py-3 text-left transition-colors', selected ? 'bg-signal/[0.07]' : 'hover:bg-ink-800/70')}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      {f && <SeverityBadge severity={f.severity} />}
                      <OutcomeBadge remediation={r} />
                    </div>
                    <p className={cn('text-sm leading-snug', selected ? 'font-medium text-fg' : 'text-fg-soft')}>{r.title}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Detail
          remediation={active}
          finding={finding}
          asset={finding ? assetIndex[finding.assetId] : undefined}
          origin={source.origin}
          onApproved={(updated) => setOverrides((prev) => ({ ...prev, [updated.id]: updated }))}
        />
      </div>
    </div>
  );
}

export function RemediationView() {
  const { source } = useDataSource();
  const { state, reload } = useSourceData<RemediationBundle>(async (src, signal) => {
    const [remediations, findings, assets] = await Promise.all([src.getRemediations(signal), src.getFindings(signal), src.getAssets(signal)]);
    return { remediations, findings, assets };
  });

  return (
    <>
      <PageHeader
        title="Remediation Studio"
        description="Review a proposed fix, approve it as a human, and see whether the backend has actually applied and verified it."
        actions={source.origin === 'SIMULATED_DEMO' ? <Badge tone="sim">Simulated demo data</Badge> : <Badge tone="signal">Backend data</Badge>}
      />
      <AsyncBoundary state={state} onRetry={reload} skeletonRows={8} label="Loading remediations">
        {(bundle) => <RemediationWorkspace bundle={bundle} />}
      </AsyncBoundary>
    </>
  );
}
