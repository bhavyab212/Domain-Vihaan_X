import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Boxes, Crosshair, History, ListChecks, Radar } from 'lucide-react';
import { AssetIcon, domainOfAssetType, type SecurityDomain } from '@/components/common/AssetIcon';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { ProvenanceBadge } from '@/components/common/ProvenanceBadge';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { EmptyState } from '@/components/common/States';
import { Badge } from '@/components/ui/Badge';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { useDataSource } from '@/app/providers/DataSourceProvider';
import { useSourceData } from '@/hooks/useSourceData';
import { ASSET_TYPE_LABEL, formatPercent, formatUtc, indexById, titleCase } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { SEVERITY_ORDER, SEVERITY_STYLE, severityRank } from '@/lib/utils/severity';
import type { AttackPath, DigitalAsset, SecurityFinding, SeverityLevel } from '@/types';

interface OverviewBundle {
  assets: DigitalAsset[];
  findings: SecurityFinding[];
  /** Optional: not declared in openapi.yaml yet, so a failure here must not hide the rest. */
  paths: AttackPath[] | null;
}

const DOMAINS: { id: SecurityDomain; label: string; scope: string }[] = [
  { id: 'APPLICATION', label: 'Application security', scope: 'Repositories, secrets, dependencies, containers' },
  { id: 'INFRASTRUCTURE', label: 'Infrastructure security', scope: 'IaC, IAM permissions, cloud storage' },
  { id: 'EXTERNAL', label: 'External attack surface', scope: 'Domains, DNS and TLS, exposed services' },
];

function SeverityTile({ severity, count }: { severity: SeverityLevel; count: number }) {
  const style = SEVERITY_STYLE[severity];
  return (
    <div className="relative overflow-hidden rounded-md border border-line bg-ink-900 px-4 py-3">
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', count > 0 ? style.bar : 'bg-line-strong')} />
      <p className="text-2xs uppercase text-fg-muted">{style.label}</p>
      <p className={cn('tabular mt-1 text-3xl font-semibold leading-none', count > 0 ? style.text : 'text-fg-faint')}>{count}</p>
      <p className="mt-1.5 text-xs text-fg-muted">open {count === 1 ? 'finding' : 'findings'}</p>
    </div>
  );
}

function FindingsSummary({ findings }: { findings: SecurityFinding[] }) {
  const counts = useMemo(() => {
    const tally = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, 0])) as Record<SeverityLevel, number>;
    for (const f of findings) if (f.status === 'OPEN') tally[f.severity] += 1;
    return tally;
  }, [findings]);

  return (
    <Panel aria-labelledby="posture-title">
      <PanelHeader
        id="posture-title"
        title="Open findings by severity"
        description="Tallied from the findings list below; no score is computed in the browser."
        action={
          <Link to="/threats" className="inline-flex items-center gap-1 text-xs font-medium text-signal hover:underline">
            View all <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        }
      />
      {findings.length === 0 ? (
        <EmptyState
          icon={<Radar className="h-7 w-7" aria-hidden />}
          title="No findings reported"
          description="Nothing has been reported yet. Run an assessment, or switch to the local preview data."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((s) => (
            <SeverityTile key={s} severity={s} count={counts[s]} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function ActivePaths({ paths }: { paths: AttackPath[] | null }) {
  return (
    <Panel aria-labelledby="paths-title">
      <PanelHeader
        id="paths-title"
        title="Potential attack paths"
        description="Inferred from relationships; not confirmed exploitation."
        action={
          <Link to="/paths" className="inline-flex items-center gap-1 text-xs font-medium text-signal hover:underline">
            Investigate <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        }
      />
      {paths === null ? (
        <EmptyState
          icon={<Crosshair className="h-6 w-6" aria-hidden />}
          title="Attack paths unavailable"
          description="The backend does not serve attack paths yet (the route is not declared in the OpenAPI contract)."
        />
      ) : paths.length === 0 ? (
        <EmptyState icon={<Crosshair className="h-6 w-6" aria-hidden />} title="No potential attack paths" description="None have been identified." />
      ) : (
        <ul className="divide-y divide-line">
          {paths.map((p) => (
            <li key={p.id} className="space-y-2 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={p.severity} />
                <Badge tone="neutral">{p.status === 'ACTIVE' ? 'Open' : 'Mitigated'}</Badge>
                <Badge tone="signal">Inferred</Badge>
                {p.isSimulated && <ProvenanceBadge provenance="SIMULATED" />}
              </div>
              <p className="text-sm font-medium leading-snug text-fg">{p.title}</p>
              <p className="text-xs text-fg-muted">
                {p.steps.length} steps · confidence {formatPercent(p.confidenceScore)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function DomainOverview({ assets, findings }: { assets: DigitalAsset[]; findings: SecurityFinding[] }) {
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

function AssetOverview({ assets }: { assets: DigitalAsset[] }) {
  return (
    <Panel aria-labelledby="assets-title">
      <PanelHeader id="assets-title" title="Asset inventory" description={`${assets.length} registered ${assets.length === 1 ? 'asset' : 'assets'}`} />
      {assets.length === 0 ? (
        <EmptyState icon={<Boxes className="h-6 w-6" aria-hidden />} title="No assets registered" description="Register an asset to begin assessing it." />
      ) : (
        <ul className="divide-y divide-line">
          {assets.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-ink-900 text-signal">
                <AssetIcon type={a.type} className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{a.name}</p>
                <p className="text-xs text-fg-muted">
                  {ASSET_TYPE_LABEL[a.type]} · {titleCase(a.environment)} · {a.owner}
                </p>
              </div>
              <Badge tone={a.criticality === 'CRITICAL' ? 'critical' : 'neutral'}>{titleCase(a.criticality)}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ActivityPanel({ findings }: { findings: SecurityFinding[] }) {
  const events = useMemo(
    () => [...findings].sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt)).slice(0, 6),
    [findings],
  );
  return (
    <Panel aria-labelledby="activity-title">
      <PanelHeader id="activity-title" title="Recent assessment activity" description="Finding discovery times reported by the data source" />
      {events.length === 0 ? (
        <EmptyState icon={<History className="h-6 w-6" aria-hidden />} title="No activity yet" description="No assessments have reported results." />
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
  const { assets, findings, paths } = bundle;
  return (
    <div className="space-y-4">
      <FindingsSummary findings={findings} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ActivePaths paths={paths} />
        <DomainOverview assets={assets} findings={findings} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <AssetOverview assets={assets} />
        <ActivityPanel findings={findings} />
      </div>
      <Recommendations findings={findings} />
    </div>
  );
}

export function OverviewView() {
  const { source } = useDataSource();
  const { state, reload } = useSourceData<OverviewBundle>(async (src, signal) => {
    const [assets, findings, paths] = await Promise.all([
      src.getAssets(signal),
      src.getFindings(signal),
      src.getAttackPaths(signal).catch(() => null),
    ]);
    return { assets, findings, paths };
  });

  return (
    <>
      <PageHeader
        title="Security Command Center"
        description="Posture at a glance: what is registered, what was found, and which potential attack paths matter most."
        actions={
          source.origin === 'SIMULATED_DEMO' ? <Badge tone="sim">Simulated demo data</Badge> : <Badge tone="signal">Backend data</Badge>
        }
      />
      <AsyncBoundary state={state} onRetry={reload} skeletonRows={7} label="Loading overview">
        {(bundle) => <OverviewContent bundle={bundle} />}
      </AsyncBoundary>
    </>
  );
}
