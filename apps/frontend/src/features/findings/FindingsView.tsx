import { useMemo, useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { AssetIcon } from '@/components/common/AssetIcon';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { ProvenanceBadge } from '@/components/common/ProvenanceBadge';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { EmptyState } from '@/components/common/States';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { useDataSource } from '@/app/providers/DataSourceProvider';
import { useSourceData } from '@/hooks/useSourceData';
import { formatUtc, indexById, titleCase } from '@/lib/utils/format';
import { SEVERITY_ORDER, severityRank } from '@/lib/utils/severity';
import type { DigitalAsset, SecurityFinding, SeverityLevel } from '@/types';
import { categoryOf } from './categories';
import { FindingDrawer } from './FindingDrawer';

interface FindingsBundle {
  findings: SecurityFinding[];
  assets: DigitalAsset[];
}

const selectClass =
  'h-9 rounded-md border border-line-strong bg-ink-950 px-2.5 text-sm text-fg hover:border-signal/50 focus-visible:ring-offset-0';

function FindingsWorkspace({ bundle }: { bundle: FindingsBundle }) {
  const { source } = useDataSource();
  const { findings, assets } = bundle;
  const assetIndex = useMemo(() => indexById(assets), [assets]);

  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel | 'ALL'>('ALL');
  const [scanner, setScanner] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const scanners = useMemo(() => [...new Set(findings.map((f) => f.scanner))].sort(), [findings]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return findings
      .filter((f) => severity === 'ALL' || f.severity === severity)
      .filter((f) => scanner === 'ALL' || f.scanner === scanner)
      .filter((f) => {
        if (!q) return true;
        const assetName = assetIndex[f.assetId]?.name ?? '';
        return [f.title, f.description, f.scanner, f.id, assetName, categoryOf(f.scanner)].some((v) => v.toLowerCase().includes(q));
      })
      .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || b.discoveredAt.localeCompare(a.discoveredAt));
  }, [findings, severity, scanner, query, assetIndex]);

  const selected = findings.find((f) => f.id === selectedId) ?? null;
  const filtered = query.trim() !== '' || severity !== 'ALL' || scanner !== 'ALL';

  if (findings.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon={<ShieldCheck className="h-7 w-7" aria-hidden />}
          title="No findings reported"
          description="The data source returned no findings. Run an assessment, or switch to the local preview data to evaluate this view."
        />
      </Panel>
    );
  }

  return (
    <>
      <Panel>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, asset, scanner or ID"
              aria-label="Search findings"
              className="h-9 w-full rounded-md border border-line-strong bg-ink-950 pl-8 pr-3 text-sm text-fg placeholder:text-fg-faint hover:border-signal/50 focus-visible:ring-offset-0"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            Severity
            <select className={selectClass} value={severity} onChange={(e) => setSeverity(e.target.value as SeverityLevel | 'ALL')}>
              <option value="ALL">All</option>
              {SEVERITY_ORDER.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            Scanner
            <select className={selectClass} value={scanner} onChange={(e) => setScanner(e.target.value)}>
              <option value="ALL">All</option>
              {scanners.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <p className="tabular ml-auto text-xs text-fg-muted" aria-live="polite">
            {visible.length} of {findings.length} {findings.length === 1 ? 'finding' : 'findings'}
          </p>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            title="No findings match these filters"
            description="Try a different search term or clear the filters."
            action={
              filtered ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setQuery('');
                    setSeverity('ALL');
                    setScanner('ALL');
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <caption className="sr-only">Security findings, highest severity first. Select a row to open its details.</caption>
              <thead>
                <tr className="border-b border-line text-2xs uppercase text-fg-muted">
                  <th scope="col" className="px-4 py-2.5 font-medium">Severity</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Finding</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Category</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Asset</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Source</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Provenance</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Discovered</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((f) => {
                  const asset = assetIndex[f.assetId];
                  return (
                    <tr
                      key={f.id}
                      data-testid="finding-row"
                      className="cursor-pointer border-b border-line transition-colors last:border-b-0 hover:bg-ink-800/70"
                      onClick={() => setSelectedId(f.id)}
                    >
                      <td className="px-4 py-3 align-top">
                        <SeverityBadge severity={f.severity} />
                      </td>
                      <td className="max-w-[340px] px-3 py-3 align-top">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(f.id);
                          }}
                          className="text-left font-medium text-fg hover:text-signal"
                        >
                          {f.title}
                        </button>
                        {f.location?.file && (
                          <p className="mt-0.5 truncate font-mono text-2xs text-fg-faint">
                            {f.location.file}
                            {f.location.line != null && `:${f.location.line}`}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top text-xs text-fg-soft">{categoryOf(f.scanner)}</td>
                      <td className="px-3 py-3 align-top">
                        <span className="flex items-center gap-2 text-xs text-fg-soft">
                          <AssetIcon type={asset?.type} className="h-3.5 w-3.5 shrink-0 text-fg-faint" />
                          {asset?.name ?? f.assetId}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <Badge>{f.scanner}</Badge>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <ProvenanceBadge provenance={f.provenance} />
                      </td>
                      <td className="tabular whitespace-nowrap px-4 py-3 align-top text-xs text-fg-muted">{formatUtc(f.discoveredAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <FindingDrawer
        finding={selected}
        asset={selected ? assetIndex[selected.assetId] : undefined}
        evidence={selected ? source.evidenceFor(selected.id) : null}
        onClose={() => setSelectedId(null)}
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
        description="Triage security findings by severity, source and asset. Every finding states whether its evidence is simulated, observed or inferred."
        actions={source.origin === 'SIMULATED_DEMO' ? <Badge tone="sim">Simulated demo data</Badge> : <Badge tone="signal">Backend data</Badge>}
      />
      <AsyncBoundary state={state} onRetry={reload} skeletonRows={7} label="Loading findings">
        {(bundle) => <FindingsWorkspace bundle={bundle} />}
      </AsyncBoundary>
    </>
  );
}
