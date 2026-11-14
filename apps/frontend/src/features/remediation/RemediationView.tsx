import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, FileDiff, Lightbulb, TriangleAlert, Wrench } from 'lucide-react';
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
import { indexById } from '@/lib/utils/format';
import type { DataOrigin, DigitalAsset, RemediationAction, SecurityFinding } from '@/types';
import { ApprovalPanel } from './ApprovalPanel';
import { LifecycleStepper } from './LifecycleStepper';
import { isVerifiedSuccess, outcomeOf, type Outcome } from './lifecycle';

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

/** Green success appears here and ONLY here, and only for backend-reported verified results. */
function VerificationResult({ remediation }: { remediation: RemediationAction }) {
  const outcome = outcomeOf(remediation);
  if (isVerifiedSuccess(remediation)) {
    return (
      <div role="status" data-testid="verification-success" className="flex gap-3 rounded-md border border-ok/40 bg-ok/10 px-4 py-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden />
        <div className="text-sm leading-relaxed text-fg-soft">
          <p className="font-semibold text-ok">Verified remediated</p>
          <p className="mt-0.5">The backend reports this remediation as applied and its re-assessment as passed.</p>
        </div>
      </div>
    );
  }
  if (outcome === 'verification-failed' || outcome === 'failed') {
    return (
      <div role="alert" className="flex gap-3 rounded-md border border-sev-critical/40 bg-sev-critical/10 px-4 py-3">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-sev-critical" aria-hidden />
        <p className="text-sm leading-relaxed text-fg-soft">
          <span className="font-semibold text-sev-critical">Not verified.</span>{' '}
          {outcome === 'failed' ? 'The backend reports that applying this change failed.' : 'The re-assessment did not pass, so the risk may remain.'}
        </p>
      </div>
    );
  }
  return (
    <p data-testid="verification-pending" className="rounded-md border border-line bg-ink-900 px-4 py-3 text-sm leading-relaxed text-fg-muted">
      <span className="font-medium text-fg-soft">No verified result.</span> Success is shown only when the backend reports a
      completed, verified remediation. Nothing has been verified yet.
    </p>
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
            <Link to="/threats" className="font-medium text-signal underline underline-offset-2">View finding</Link>
          </div>
          <div className="flex gap-2.5">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
            <div>
              <h3 className="text-2xs uppercase text-fg-muted">Recommended fix</h3>
              <p className="mt-1 text-sm leading-relaxed text-fg-soft">{remediation.description}</p>
            </div>
          </div>
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
            <p className="text-xs leading-relaxed text-sim">
              Illustrative diff for the synthetic scenario. Secrets are masked and placeholders must be completed by a person.
            </p>
          )}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel aria-labelledby="risk-title">
          <PanelHeader id="risk-title" title="Risk reduction" description="What this change is intended to do" />
          <div className="space-y-2 p-4 text-sm leading-relaxed text-fg-soft">
            <p>{finding?.remediationGuidance ?? 'No remediation guidance was supplied with this finding.'}</p>
            <p className="text-xs text-fg-muted">
              This describes the intent of the change. Actual risk reduction is established only by a verified re-assessment, and no
              score is estimated here.
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel aria-labelledby="exec-title">
          <PanelHeader id="exec-title" title="Execution state" description="As reported by the backend" />
          <div className="p-4">
            <LifecycleStepper remediation={remediation} />
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
  const [overrides, setOverrides] = useState<Record<string, RemediationAction>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const remediations = useMemo(() => bundle.remediations.map((r) => overrides[r.id] ?? r), [bundle.remediations, overrides]);
  const findingIndex = useMemo(() => indexById(findings), [findings]);
  const assetIndex = useMemo(() => indexById(assets), [assets]);

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

  const active = remediations.find((r) => r.id === selectedId) ?? remediations[0];
  const finding = findingIndex[active.findingId];

  return (
    <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
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
                  onClick={() => setSelectedId(r.id)}
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
