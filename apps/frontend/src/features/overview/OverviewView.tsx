import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Boxes, History, ListChecks } from 'lucide-react';
import { AssetIcon, domainOfAssetType, type SecurityDomain } from '@/components/common/AssetIcon';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { EmptyState } from '@/components/common/States';
import { Badge } from '@/components/ui/Badge';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { useDataSource } from '@/app/providers/DataSourceProvider';
import { assetFacts } from '@/features/graph/model';
import { useSourceData } from '@/hooks/useSourceData';
import { ASSET_TYPE_LABEL, formatUtc, indexById, parseApiDate, titleCase } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { SEVERITY_STYLE, severityRank } from '@/lib/utils/severity';
import type { AssetType, AttackPath, DigitalAsset, RemediationAction, SecurityFinding, SecurityGraph } from '@/types';
import { KpiGrid } from './KpiGrid';
import { PathPreview } from './PathPreview';
import { computePosture } from './posture';
import { StatusStrip } from './StatusStrip';

interface OverviewBundle {
  assets: DigitalAsset[];
  findings: SecurityFinding[];
  /** Optional endpoints: a failure (null) must not hide the rest, and must read as "unavailable", never as zero. */
  paths: AttackPath[] | null;
  graph: SecurityGraph | null;
  remediations: RemediationAction[] | null;
}

/** What the inventory panels need about an asset. Optional fields stay absent when the source does not supply them. */
interface DisplayAsset {
  id: string;
  name: string;
  type: AssetType;
  environment?: string;
  criticality?: string;
  owner?: string;
}

const DOMAINS: { id: SecurityDomain; label: string; scope: string }[] = [
  { id: 'APPLICATION', label: 'Application security', scope: 'Repositories, secrets, dependencies, containers' },
  { id: 'INFRASTRUCTURE', label: 'Infrastructure security', scope: 'IaC, IAM permissions, cloud storage' },
  { id: 'EXTERNAL', label: 'External attack surface', scope: 'Domains, DNS and TLS, exposed services' },
];

/**
 * The asset list to display. The inventory wins. When GET /assets returns nothing but the graph names assets (Dev A's
 * backend today), show what the graph supplies and say so. Only validated facts are used; an asset whose type the
 * graph does not state is skipped rather than guessed, and absent fields are left absent.
 */
function displayAssets(assets: DigitalAsset[], graph: SecurityGraph | null): { items: DisplayAsset[]; fromGraph: boolean } {
  if (assets.length > 0) return { items: assets, fromGraph: false };
  const items: DisplayAsset[] = [];
  for (const node of graph?.nodes ?? []) {
    if (node.type === 'FINDING') continue;
    const facts = assetFacts(node, undefined);
    if (!facts.assetType) continue;
    items.push({ id: node.id, name: node.label, type: facts.assetType, environment: facts.environment, criticality: facts.criticality, owner: facts.owner });
  }
  return { items, fromGraph: items.length > 0 };
}

function DomainOverview({ assets, findings }: { assets: DisplayAsset[]; findings: SecurityFinding[] }) {
  const rows = useMemo(() => {
    const assetIndex = indexById(assets);
    return DOMAINS.map((d) => {
      const inDomain = assets.filter((a) => domainOfAssetType(a.type) === d.id);
      const domainFindings = findings.filter((f) => {
        const asset = assetIndex[f.assetId];
        return asset && domainOfAssetType(asset.type) === d.id;
      });
      return { ...d, assets: inDomain.length, findings: domainFindings.length };
    });
  }, [assets, findings]);

  return (
    <Panel aria-labelledby="domains-title">
      <PanelHeader id="domains-title" title="Security domains" description="The three MVP coverage areas" />
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-fg">{row.label}</p>
              <p className="truncate text-xs text-fg-muted">{row.scope}</p>
            </div>
            <div className="tabular flex shrink-0 gap-5 text-right text-xs">
              <div>
                <p className="text-base font-semibold text-fg">{row.assets}</p>
                <p className="text-fg-muted">assets</p>
              </div>
              <div>
                <p className="text-base font-semibold text-fg">{row.findings}</p>
                <p className="text-fg-muted">findings</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function AssetOverview({ assets, fromGraph }: { assets: DisplayAsset[]; fromGraph: boolean }) {
  return (
    <Panel aria-labelledby="assets-title">
      <PanelHeader
        id="assets-title"
        title="Asset inventory"
        description={
          fromGraph
            ? `${assets.length} ${assets.length === 1 ? 'asset' : 'assets'} named by the graph. The inventory endpoint returned none.`
            : `${assets.length} registered ${assets.length === 1 ? 'asset' : 'assets'}`
        }
      />
      {assets.length === 0 ? (
        <EmptyState icon={<Boxes className="h-6 w-6" aria-hidden />} title="No assets registered" description="Register an asset to begin assessing it." />
      ) : (
        <ul className="divide-y divide-line">
          {assets.map((a) => {
            const meta = [ASSET_TYPE_LABEL[a.type], a.environment && titleCase(a.environment), a.owner].filter(Boolean).join(' · ');
            return (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-ink-900 text-signal">
                  <AssetIcon type={a.type} className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{a.name}</p>
                  <p className="text-xs text-fg-muted">{meta}</p>
                </div>
                {a.criticality && <Badge tone={a.criticality === 'CRITICAL' ? 'critical' : 'neutral'}>{titleCase(a.criticality)}</Badge>}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function ActivityPanel({ findings }: { findings: SecurityFinding[] }) {
  const events = useMemo(
    () =>
      [...findings]
        .sort((a, b) => (parseApiDate(b.discoveredAt)?.getTime() ?? 0) - (parseApiDate(a.discoveredAt)?.getTime() ?? 0))
        .slice(0, 6),
    [findings],
  );
  return (
    <Panel aria-labelledby="activity-title">
      <PanelHeader
        id="activity-title"
        title="Recent finding discoveries"
        description="Discovery times reported on findings. This is not an assessment log; the backend serves no assessment history yet."
      />
      {events.length === 0 ? (
        <EmptyState icon={<History className="h-6 w-6" aria-hidden />} title="No activity yet" description="No findings with discovery times have been reported." />
      ) : (
        <ol className="space-y-0 px-4 py-3">
          {events.map((f) => (
            <li key={f.id} className="relative flex gap-3 pb-4 last:pb-0">
              <span aria-hidden className="absolute bottom-0 left-[5px] top-3 w-px bg-line last:hidden" />
              <span aria-hidden className={cn('relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', SEVERITY_STYLE[f.severity].dot)} />
              <div className="min-w-0">
                <p className="text-sm text-fg">{f.title}</p>
                <p className="text-xs text-fg-muted">
                  {f.scanner} · {formatUtc(f.discoveredAt)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function Recommendations({ findings }: { findings: SecurityFinding[] }) {
  const items = useMemo(
    () =>
      findings
        .filter((f) => f.status === 'OPEN' && f.remediationGuidance)
        .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
        .slice(0, 4),
    [findings],
  );
  return (
    <Panel aria-labelledby="recs-title">
      <PanelHeader
        id="recs-title"
        title="Priority recommendations"
        description="Guidance supplied with each finding, highest severity first"
        action={
          <Link to="/remediation" className="inline-flex items-center gap-1 text-xs font-medium text-signal hover:underline">
            Remediation <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        }
      />
      {items.length === 0 ? (
        <EmptyState icon={<ListChecks className="h-6 w-6" aria-hidden />} title="No recommendations" description="No open findings carry remediation guidance." />
      ) : (
        <ol className="divide-y divide-line">
          {items.map((f, i) => (
            <li key={f.id} className="flex gap-3 px-4 py-3">
              <span className="tabular mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-line-strong text-2xs font-semibold text-fg-soft">
                {i + 1}
              </span>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={f.severity} />
                  <span className="text-xs text-fg-muted">{f.title}</span>
                </div>
                <p className="text-sm leading-relaxed text-fg">{f.remediationGuidance}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function OverviewContent({ bundle }: { bundle: OverviewBundle }) {
  const { assets, findings, paths, graph, remediations } = bundle;
  const posture = useMemo(() => computePosture({ assets, findings, paths, graph, remediations }), [assets, findings, paths, graph, remediations]);
  const shown = useMemo(() => displayAssets(assets, graph), [assets, graph]);
  const assetIndex = useMemo(() => indexById(assets), [assets]);

  return (
    <div className="space-y-4">
      <KpiGrid posture={posture} />
      <PathPreview paths={paths} graph={graph} assets={assetIndex} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DomainOverview assets={shown.items} findings={findings} />
        <AssetOverview assets={shown.items} fromGraph={shown.fromGraph} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ActivityPanel findings={findings} />
        <Recommendations findings={findings} />
      </div>
    </div>
  );
}

export function OverviewView() {
  const { source } = useDataSource();
  const { state, reload } = useSourceData<OverviewBundle>(async (src, signal) => {
    const [assets, findings, paths, graph, remediations] = await Promise.all([
      src.getAssets(signal),
      src.getFindings(signal),
      // Optional endpoints: unavailable must read as "unavailable" (null), not as an empty list.
      src.getAttackPaths(signal).catch(() => null),
      src.getSecurityGraph(signal).catch(() => null),
      src.getRemediations(signal).catch(() => null),
    ]);
    return { assets, findings, paths, graph, remediations };
  });

  return (
    <>
      <PageHeader
        title="Security Command Center"
        description="Posture at a glance: what is registered, what was found, and which potential attack paths matter most. Every number is a count of records the data source returned."
        actions={
          source.origin === 'SIMULATED_DEMO' ? <Badge tone="sim">Simulated demo data</Badge> : <Badge tone="signal">Backend data</Badge>
        }
      />
      <div className="space-y-4">
        {/* Outside the data boundary on purpose: "connecting" and "unavailable" are exactly when status matters. */}
        <StatusStrip />
        <AsyncBoundary state={state} onRetry={reload} skeletonRows={7} label="Loading overview">
          {(bundle) => <OverviewContent bundle={bundle} />}
        </AsyncBoundary>
      </div>
    </>
  );
}
