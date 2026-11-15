import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/States';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { useDataSource } from '@/app/providers/DataSourceProvider';
import { useSourceData } from '@/hooks/useSourceData';
import { indexById } from '@/lib/utils/format';
import type { DigitalAsset, SecurityFinding } from '@/types';
import { CategoryTabs } from './CategoryTabs';
import { FilterBar } from './FilterBar';
import { FindingDrawer } from './FindingDrawer';
import { FindingsTable } from './FindingsTable';
import { SeverityStrip } from './SeverityStrip';
import {
  applyFilters,
  categoryCounts,
  DEFAULT_FILTERS,
  nextSort,
  sortFindings,
  type SortKey,
  type TriageFilters,
} from './triage';
import { parseTriageState, serializeTriageState } from './urlState';

interface FindingsBundle {
  findings: SecurityFinding[];
  assets: DigitalAsset[];
}

function FindingsWorkspace({ bundle }: { bundle: FindingsBundle }) {
  const { source } = useDataSource();
  const { findings, assets } = bundle;
  const assetIndex = useMemo(() => indexById(assets), [assets]);

  // All triage state lives in the URL (filters, sort, open finding) so reload / share restores the exact view.
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => parseTriageState(params), [params]);
  const { filters, sort, selectedId } = state;

  const update = useCallback(
    (next: Partial<typeof state>, opts: { replace?: boolean } = {}) => {
      setParams((current) => serializeTriageState({ ...parseTriageState(current), ...next }, current), { replace: opts.replace ?? true });
    },
    [setParams],
  );
  const setFilters = useCallback(
    (patch: Partial<TriageFilters>) => update({ filters: { ...parseTriageState(params).filters, ...patch } }),
    [update, params],
  );

  const scanners = useMemo(() => [...new Set(findings.map((f) => f.scanner))].sort(), [findings]);

  const matching = useMemo(() => applyFilters(findings, filters, assetIndex), [findings, filters, assetIndex]);
  const visible = useMemo(() => sortFindings(matching, sort), [matching, sort]);
  const severityScope = useMemo(() => applyFilters(findings, filters, assetIndex, 'severity'), [findings, filters, assetIndex]);
  const counts = useMemo(() => categoryCounts(findings, filters, assetIndex), [findings, filters, assetIndex]);

  const selected = useMemo(() => findings.find((f) => f.id === selectedId) ?? null, [findings, selectedId]);
  const selectedIndex = selected ? visible.findIndex((f) => f.id === selected.id) : -1;

  // Selecting a finding is navigation (push) so Back closes the drawer; everything else replaces the entry.
  const open = (id: string) => update({ selectedId: id }, { replace: false });
  const close = useCallback(() => update({ selectedId: null }, { replace: false }), [update]);
  const step = useCallback(
    (delta: number) => {
      if (visible.length === 0 || selectedIndex === -1) return;
      const next = visible[(selectedIndex + delta + visible.length) % visible.length];
      update({ selectedId: next.id });
    },
    [visible, selectedIndex, update],
  );

  // j / k (and arrow keys) move between findings while the drawer is open.
  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === 'j' || event.key === 'ArrowDown') step(1);
      if (event.key === 'k' || event.key === 'ArrowUp') step(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected, step]);

  if (findings.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon={<ShieldCheck className="h-7 w-7" aria-hidden />}
          title="No findings reported"
          description={
            source.origin === 'SIMULATED_DEMO'
              ? 'The local preview contains no findings.'
              : 'The backend returned no findings. Run an assessment, or switch to the local preview data to evaluate this view.'
          }
        />
      </Panel>
    );
  }

  return (
    <>
      <Panel>
        <CategoryTabs value={filters.category} onChange={(category) => setFilters({ category })} counts={counts} total={Object.values(counts).reduce((a, b) => a + b, 0)} />
        <SeverityStrip findings={severityScope} value={filters.severity} onChange={(severity) => setFilters({ severity })} />
        <FilterBar
          filters={filters}
          onChange={setFilters}
          onClearAll={() => update({ filters: DEFAULT_FILTERS })}
          scanners={scanners}
          assets={assets}
          shown={visible.length}
          total={findings.length}
        />

        {visible.length === 0 ? (
          <EmptyState
            title="No findings match these filters"
            description="Try a different search term, or clear the filters."
            action={
              <Button size="sm" onClick={() => update({ filters: DEFAULT_FILTERS })}>
                Clear all filters
              </Button>
            }
          />
        ) : (
          <FindingsTable
            findings={visible}
            assets={assetIndex}
            sort={sort}
            onSort={(key: SortKey) => update({ sort: nextSort(sort, key) })}
            selectedId={selectedId}
            onSelect={open}
          />
        )}
      </Panel>

      {selectedId && !selected && (
        // A shared link can point at a finding that no longer exists, or exists only in the other data source.
        <p role="status" className="mt-3 rounded-md border border-line bg-ink-850 px-3 py-2 text-xs text-fg-muted">
          Finding “{selectedId}” was not found in {source.origin === 'SIMULATED_DEMO' ? 'the local preview data' : 'the backend data'}.{' '}
          <button type="button" onClick={close} className="font-medium text-signal underline underline-offset-2">
            Dismiss
          </button>
        </p>
      )}

      <FindingDrawer
        finding={selected}
        asset={selected ? assetIndex[selected.assetId] : undefined}
        evidence={selected ? source.evidenceFor(selected.id) : null}
        onClose={close}
        position={selected && selectedIndex >= 0 ? { index: selectedIndex, total: visible.length } : undefined}
        onPrevious={() => step(-1)}
        onNext={() => step(1)}
      />
    </>
  );
}

export function FindingsView() {
  const { source } = useDataSource();
  const { state, reload } = useSourceData<FindingsBundle>(async (src, signal) => {
    const [findings, assets] = await Promise.all([src.getFindings(signal), src.getAssets(signal)]);
    return { findings, assets };
  });

  return (
    <>
      <PageHeader
        title="Threats & Findings"
        description="Triage security findings by severity, category, source and asset. Every finding states whether its evidence is simulated, observed or inferred."
        actions={source.origin === 'SIMULATED_DEMO' ? <Badge tone="sim">Simulated demo data</Badge> : <Badge tone="signal">Backend data</Badge>}
      />
      <AsyncBoundary state={state} onRetry={reload} skeletonRows={8} label="Loading findings">
        {(bundle) => <FindingsWorkspace bundle={bundle} />}
      </AsyncBoundary>
    </>
  );
}
