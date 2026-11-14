import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, Crosshair, Flag, Info, Link2, Milestone, ShieldQuestion, Target } from 'lucide-react';
import { AssetIcon } from '@/components/common/AssetIcon';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { ProvenanceBadge } from '@/components/common/ProvenanceBadge';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { EmptyState } from '@/components/common/States';
import { Badge } from '@/components/ui/Badge';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { useDataSource } from '@/app/providers/DataSourceProvider';
import { useSourceData } from '@/hooks/useSourceData';
import { cn } from '@/lib/utils/cn';
import { ASSET_TYPE_LABEL, formatPercent, formatUtc, indexById, titleCase } from '@/lib/utils/format';
import type { AttackPath, DigitalAsset, SecurityFinding } from '@/types';

interface PathsBundle {
  paths: AttackPath[];
  assets: DigitalAsset[];
  findings: SecurityFinding[];
}

/** The single most important honesty statement on this page. */
function InferenceNotice({ path }: { path: AttackPath }) {
  return (
    <div role="note" className="flex gap-3 rounded-md border border-signal/30 bg-signal/[0.07] px-4 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
      <div className="text-sm leading-relaxed text-fg-soft">
        <p className="font-semibold text-fg">Inferred potential path, not a confirmed exploit.</p>
        <p className="mt-0.5">
          This chain was derived by linking related findings and relationships. Nothing here was exploited or
          experimentally validated{path.isSimulated ? ', and the underlying scenario is simulated' : ''}. It describes how
          weaknesses could combine, not a breach in progress.
        </p>
      </div>
    </div>
  );
}

function PathSelector({ paths, selectedId, onSelect }: { paths: AttackPath[]; selectedId: string; onSelect: (id: string) => void }) {
  if (paths.length < 2) return null;
  return (
    <div role="tablist" aria-label="Attack paths" className="mb-4 flex flex-wrap gap-2">
      {paths.map((p) => (
        <button
          key={p.id}
          role="tab"
          type="button"
          aria-selected={p.id === selectedId}
          onClick={() => onSelect(p.id)}
          className={cn(
            'rounded-md border px-3 py-1.5 text-xs font-medium',
            p.id === selectedId ? 'border-signal/50 bg-signal/10 text-signal' : 'border-line-strong bg-ink-850 text-fg-muted hover:text-fg',
          )}
        >
          {p.title}
        </button>
      ))}
    </div>
  );
}

function StepCard({
  step,
  asset,
  finding,
  role,
  isChokePoint,
}: {
  step: AttackPath['steps'][number];
  asset: DigitalAsset | undefined;
  finding: SecurityFinding | undefined;
  role: 'entry' | 'intermediate' | 'target';
  isChokePoint: boolean;
}) {
  const roleLabel = role === 'entry' ? 'Entry point' : role === 'target' ? 'Target asset' : 'Intermediate step';
  return (
    <li className="relative" data-testid="path-step" data-role={role}>
      <div className={cn('rounded-md border bg-ink-850 p-4', isChokePoint ? 'border-sev-high/50' : 'border-line-strong')}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="tabular flex h-6 w-6 items-center justify-center rounded-full border border-line-strong bg-ink-900 text-xs font-semibold text-fg">
            {step.stepNumber}
          </span>
          <Badge tone={role === 'entry' ? 'signal' : role === 'target' ? 'critical' : 'neutral'}>{roleLabel}</Badge>
          {isChokePoint && <Badge tone="warn">Choke point</Badge>}
          {step.mitreTactic && <span className="text-xs text-fg-muted">{step.mitreTactic}</span>}
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-ink-900 text-signal">
            <AssetIcon type={asset?.type} className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg">{asset?.name ?? step.assetId}</p>
            {asset && (
              <p className="text-xs text-fg-muted">
                {ASSET_TYPE_LABEL[asset.type]} · {titleCase(asset.environment)}
              </p>
            )}
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-fg-soft">{step.description}</p>
        <p className="mt-2 text-xs text-fg-muted">
          Technique: <span className="text-fg-soft">{step.technique}</span>
          <span className="ml-1 text-fg-faint">(descriptive label, not a verified technique)</span>
        </p>

        {finding && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs">
            <Link2 className="h-3.5 w-3.5 text-fg-faint" aria-hidden />
            <span className="text-fg-muted">Evidence:</span>
            <SeverityBadge severity={finding.severity} />
            <span className="text-fg-soft">{finding.title}</span>
            <ProvenanceBadge provenance={finding.provenance} />
          </div>
        )}
      </div>
    </li>
  );
}

function PathDetail({ path, assets, findings }: { path: AttackPath; assets: DigitalAsset[]; findings: SecurityFinding[] }) {
  const assetIndex = useMemo(() => indexById(assets), [assets]);
  const findingIndex = useMemo(() => indexById(findings), [findings]);
  const steps = [...path.steps].sort((a, b) => a.stepNumber - b.stepNumber);
  const entry = assetIndex[path.entryPointAssetId];
  const target = assetIndex[path.crownJewelAssetId];
  const choke = path.chokePointAssetId ? assetIndex[path.chokePointAssetId] : undefined;
  const evidenceIds = [...new Set(steps.map((s) => s.findingId).filter((id): id is string => !!id))];

  return (
    <div className="space-y-4">
      <InferenceNotice path={path} />

      <Panel aria-labelledby="path-overview">
        <PanelHeader
          id="path-overview"
          title={path.title}
          action={
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <SeverityBadge severity={path.severity} />
              <Badge tone="signal">Inferred</Badge>
              {path.isSimulated && <ProvenanceBadge provenance="SIMULATED_DEMO" />}
            </div>
          }
        />
        <div className="space-y-4 p-4">
          <p className="max-w-3xl text-sm leading-relaxed text-fg-soft">{path.summary}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-line bg-ink-900 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-2xs uppercase text-fg-muted"><Flag className="h-3 w-3" aria-hidden />Entry point</p>
              <p className="mt-1 truncate text-sm font-medium text-fg">{entry?.name ?? path.entryPointAssetId}</p>
            </div>
            <div className="rounded-md border border-line bg-ink-900 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-2xs uppercase text-fg-muted"><Target className="h-3 w-3" aria-hidden />Target asset</p>
              <p className="mt-1 truncate text-sm font-medium text-fg">{target?.name ?? path.crownJewelAssetId}</p>
            </div>
            <div className="rounded-md border border-line bg-ink-900 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-2xs uppercase text-fg-muted"><Milestone className="h-3 w-3" aria-hidden />Length</p>
              <p className="tabular mt-1 text-sm font-medium text-fg">{steps.length} steps</p>
            </div>
            <div className="rounded-md border border-line bg-ink-900 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-2xs uppercase text-fg-muted"><ShieldQuestion className="h-3 w-3" aria-hidden />Confidence</p>
              <p className="tabular mt-1 text-sm font-medium text-fg">{formatPercent(path.confidenceScore)}</p>
              <p className="text-2xs text-fg-faint">engine estimate, not proof</p>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel aria-labelledby="steps-title">
          <PanelHeader id="steps-title" title="Potential path, step by step" description="Read top to bottom: entry point to target asset" />
          <ol className="space-y-0 p-4">
            {steps.map((step, index) => (
              <div key={step.stepNumber}>
                <StepCard
                  step={step}
                  asset={assetIndex[step.assetId]}
                  finding={step.findingId ? findingIndex[step.findingId] : undefined}
                  role={index === 0 ? 'entry' : index === steps.length - 1 ? 'target' : 'intermediate'}
                  isChokePoint={path.chokePointAssetId === step.assetId}
                />
                {index < steps.length - 1 && (
                  <div aria-hidden className="flex justify-center py-1.5 text-fg-faint">
                    <ArrowDown className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
          </ol>
        </Panel>

        <div className="space-y-4 self-start">
          <Panel aria-labelledby="choke-title">
            <PanelHeader id="choke-title" title="Choke point" description="Where one fix would interrupt the path" />
            <div className="p-4 text-sm leading-relaxed text-fg-soft">
              {choke ? (
                <>
                  <p>
                    <span className="font-medium text-fg">{choke.name}</span> was identified by the backend as the choke point. Reducing
                    exposure here would cut the inferred chain between the entry point and the target.
                  </p>
                  <p className="mt-2 text-xs text-fg-muted">This is the backend's analysis. The UI does not compute it, and it is not verified until a re-assessment confirms it.</p>
                </>
              ) : (
                <p className="text-fg-muted">The data source did not identify a choke point for this path.</p>
              )}
            </div>
          </Panel>

          <Panel aria-labelledby="evidence-title">
            <PanelHeader id="evidence-title" title="Evidence references" description="Findings that support each step" />
            {evidenceIds.length === 0 ? (
              <p className="p-4 text-xs text-fg-muted">No findings are referenced by this path.</p>
            ) : (
              <ul className="divide-y divide-line">
                {evidenceIds.map((id) => {
                  const f = findingIndex[id];
                  return (
                    <li key={id} className="space-y-1.5 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {f && <SeverityBadge severity={f.severity} />}
                        {f && <ProvenanceBadge provenance={f.provenance} />}
                      </div>
                      <p className="text-sm text-fg">{f?.title ?? id}</p>
                      <p className="font-mono text-2xs text-fg-faint">{id}</p>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="border-t border-line px-4 py-3 text-xs">
              <Link to="/threats" className="font-medium text-signal underline underline-offset-2">Review findings</Link>
              <span className="mx-2 text-fg-faint">·</span>
              <Link to="/remediation" className="font-medium text-signal underline underline-offset-2">Plan remediation</Link>
            </div>
          </Panel>

          <Panel aria-labelledby="risk-title">
            <PanelHeader id="risk-title" title="Risk summary" />
            <dl className="divide-y divide-line px-4 text-xs">
              <div className="flex justify-between py-2.5"><dt className="text-fg-muted">Severity</dt><dd><SeverityBadge severity={path.severity} /></dd></div>
              <div className="flex justify-between py-2.5"><dt className="text-fg-muted">Status</dt><dd className="text-fg">{path.status === 'ACTIVE' ? 'Open' : 'Mitigated'}</dd></div>
              <div className="flex justify-between py-2.5"><dt className="text-fg-muted">Identified</dt><dd className="text-fg">{formatUtc(path.createdAt)}</dd></div>
              <div className="flex justify-between py-2.5"><dt className="text-fg-muted">Nature</dt><dd className="text-fg">Inferred, unconfirmed</dd></div>
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function PathsWorkspace({ bundle }: { bundle: PathsBundle }) {
  const { paths, assets, findings } = bundle;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (paths.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon={<Crosshair className="h-7 w-7" aria-hidden />}
          title="No potential attack paths"
          description="No related weaknesses have been linked into a path yet."
        />
      </Panel>
    );
  }
  const active = paths.find((p) => p.id === selectedId) ?? paths[0];
  return (
    <>
      <PathSelector paths={paths} selectedId={active.id} onSelect={setSelectedId} />
      <PathDetail path={active} assets={assets} findings={findings} />
    </>
  );
}

export function AttackPathsView() {
  const { source } = useDataSource();
  const { state, reload } = useSourceData<PathsBundle>(async (src, signal) => {
    const [paths, assets, findings] = await Promise.all([src.getAttackPaths(signal), src.getAssets(signal), src.getFindings(signal)]);
    return { paths, assets, findings };
  });

  return (
    <>
      <PageHeader
        title="Attack Path Investigation"
        description="How several related weaknesses could combine into a route to a business-critical asset. Paths are inferred, never presented as confirmed exploits."
        actions={source.origin === 'SIMULATED_DEMO' ? <Badge tone="sim">Simulated demo data</Badge> : <Badge tone="signal">Backend data</Badge>}
      />
      <AsyncBoundary state={state} onRetry={reload} skeletonRows={7} label="Loading attack paths">
        {(bundle) => <PathsWorkspace bundle={bundle} />}
      </AsyncBoundary>
    </>
  );
}
