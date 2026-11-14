import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Crosshair, SearchX } from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { Drawer } from '@/components/common/Drawer';
import { PageHeader } from '@/components/common/PageHeader';
import { ProvenanceBadge } from '@/components/common/ProvenanceBadge';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { EmptyState } from '@/components/common/States';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Panel';
import { useDataSource } from '@/app/providers/DataSourceProvider';
import { useSourceData } from '@/hooks/useSourceData';
import { formatPercent } from '@/lib/utils/format';
import type { AttackPath, DigitalAsset, RemediationAction, SecurityFinding, SecurityGraph } from '@/types';
import { InferenceNotice, PathInvestigation } from './PathInvestigation';
import { buildPathModel, orderPaths, parsePathParam } from './pathModel';

interface PathsBundle {
  paths: AttackPath[];
  assets: DigitalAsset[];
  findings: SecurityFinding[];
  /** Optional context. null = unavailable; the investigation still works from the path's own ids. */
  graph: SecurityGraph | null;
  remediations: RemediationAction[] | null;
}

function PathRow({ model, onOpen }: { model: ReturnType<typeof buildPathModel>; onOpen: () => void }) {
  const { path, hops } = model;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        data-testid="path-row"
        data-path-id={path.id}
        className="block w-full space-y-2.5 rounded-lg border border-line bg-ink-850 p-4 text-left shadow-panel transition-colors hover:border-signal/50"
      >
        <span className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={path.severity} />
          <Badge tone="neutral">{path.status === 'ACTIVE' ? 'Open' : 'Mitigated'}</Badge>
          <Badge tone="signal">Inferred</Badge>
          {path.isSimulated && <ProvenanceBadge provenance="SIMULATED_DEMO" />}
        </span>
        <span className="block text-sm font-semibold leading-snug text-fg">{path.title}</span>
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-fg-muted">
          {hops.map((h, i) => (
            <span key={h.stepNumber} className="inline-flex items-center gap-1.5">
              {i > 0 && <span aria-hidden className="text-fg-faint">→</span>}
              <span className="text-fg-soft">{h.asset.name}</span>
            </span>
          ))}
        </span>
        <span className="block text-xs text-fg-muted">
          {hops.length} steps · confidence {formatPercent(path.confidenceScore)} (engine estimate) · open for the kill chain and evidence
        </span>
      </button>
    </li>
  );
}

function PathsWorkspace({ bundle }: { bundle: PathsBundle }) {
  const { paths, assets, findings, graph, remediations } = bundle;
  const [params, setParams] = useSearchParams();
  const selectedId = parsePathParam(params.get('p'));

  const ctx = useMemo(() => ({ assets, findings, graph, remediations }), [assets, findings, graph, remediations]);
  const models = useMemo(() => orderPaths(paths).map((p) => buildPathModel(p, ctx)), [paths, ctx]);
  const selected = selectedId ? models.find((m) => m.path.id === selectedId) : undefined;

  // Opening is a history entry (Back closes the drawer); closing replaces so it does not pile up entries.
  const open = (id: string) => setParams((prev) => { const next = new URLSearchParams(prev); next.set('p', id); return next; });
  const close = useCallback(
    () => setParams((prev) => { const next = new URLSearchParams(prev); next.delete('p'); return next; }, { replace: true }),
    [setParams],
  );

  if (paths.length === 0) {
    return (
      <Panel>
        <EmptyState icon={<Crosshair className="h-7 w-7" aria-hidden />} title="No potential attack paths" description="No related weaknesses have been linked into a path in the current data." />
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <InferenceNotice simulated={paths.some((p) => p.isSimulated)} />

      {selectedId && !selected && (
        <div role="status" className="flex items-start gap-3 rounded-md border border-line-strong bg-ink-900 px-4 py-3 text-sm text-fg-soft" data-testid="path-not-found">
          <SearchX className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
          <p>
            No attack path <code className="font-mono text-fg">{selectedId}</code> exists in the current data source. It may belong to the other source
            (preview or backend) or may have been removed.
          </p>
        </div>
      )}

      <ul className="grid gap-3 lg:grid-cols-2" aria-label="Potential attack paths">
        {models.map((m) => (
          <PathRow key={m.path.id} model={m} onOpen={() => open(m.path.id)} />
        ))}
      </ul>

      <Drawer open={!!selected} onClose={close} title={selected?.path.title ?? ''} subtitle={selected && <Badge tone="signal">Inferred, unconfirmed</Badge>}>
        {selected && <PathInvestigation model={selected} />}
      </Drawer>
    </div>
  );
}

export function AttackPathsView() {
  const { source } = useDataSource();
  const { state, reload } = useSourceData<PathsBundle>(async (src, signal) => {
    const [paths, assets, findings, graph, remediations] = await Promise.all([
      src.getAttackPaths(signal),
      src.getAssets(signal),
      src.getFindings(signal),
      // Context only: an unavailable graph or remediation list must not hide the paths themselves.
      src.getSecurityGraph(signal).catch(() => null),
      src.getRemediations(signal).catch(() => null),
    ]);
    return { paths, assets, findings, graph, remediations };
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
