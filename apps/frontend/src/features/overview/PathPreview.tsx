import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Crosshair } from 'lucide-react';
import { ProvenanceBadge } from '@/components/common/ProvenanceBadge';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { EmptyState } from '@/components/common/States';
import { Badge } from '@/components/ui/Badge';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { formatPercent } from '@/lib/utils/format';
import type { AttackPath, DigitalAsset, SecurityGraph } from '@/types';

/** Label for a step's asset: the graph's own node label, else the inventory name, else the raw id. */
export function stepLabel(assetId: string, graph: SecurityGraph | null, assets: Record<string, DigitalAsset>): string {
  return graph?.nodes.find((n) => n.id === assetId)?.label ?? assets[assetId]?.name ?? assetId;
}

/**
 * Compact kill-chain of the most severe open path, using only ids and text the backend supplied. It is labelled an
 * inferred potential path everywhere it appears; "Investigate" opens the full investigation.
 */
export function PathPreview({ paths, graph, assets }: { paths: AttackPath[] | null; graph: SecurityGraph | null; assets: Record<string, DigitalAsset> }) {
  const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];
  const top = paths ? [...paths].filter((p) => p.status === 'ACTIVE').sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity))[0] : undefined;

  return (
    <Panel aria-labelledby="path-preview-title" data-testid="path-preview">
      <PanelHeader
        id="path-preview-title"
        title="Most severe potential attack path"
        description="Inferred from relationships. Not a confirmed exploit."
        action={
          top && (
            <Link to={`/paths?p=${encodeURIComponent(top.id)}`} className="inline-flex items-center gap-1 text-xs font-medium text-signal hover:underline">
              Investigate <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          )
        }
      />
      {paths === null ? (
        <EmptyState icon={<Crosshair className="h-6 w-6" aria-hidden />} title="Attack paths unavailable" description="The backend did not return attack paths, so none are shown. Nothing is inferred locally." />
      ) : !top ? (
        <EmptyState icon={<Crosshair className="h-6 w-6" aria-hidden />} title="No open potential attack paths" description="None have been identified in the current data." />
      ) : (
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={top.severity} />
            <Badge tone="signal">Inferred</Badge>
            {top.isSimulated && <ProvenanceBadge provenance="SIMULATED_DEMO" />}
            <span className="tabular text-xs text-fg-muted">
              {top.steps.length} steps · confidence {formatPercent(top.confidenceScore)} (engine estimate)
            </span>
          </div>
          <p className="text-sm font-medium leading-snug text-fg">{top.title}</p>
          <ol className="flex flex-wrap items-stretch gap-x-1 gap-y-2" aria-label="Path steps">
            {[...top.steps]
              .sort((a, b) => a.stepNumber - b.stepNumber)
              .map((step, i, all) => (
                <Fragment key={step.stepNumber}>
                  <li className="min-w-[120px] flex-1 rounded-md border border-line bg-ink-900 px-3 py-2" data-testid="path-preview-step">
                    <p className="text-2xs uppercase text-fg-muted">{i === 0 ? 'Entry' : i === all.length - 1 ? 'Target' : `Step ${step.stepNumber}`}</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-fg" title={stepLabel(step.assetId, graph, assets)}>
                      {stepLabel(step.assetId, graph, assets)}
                    </p>
                  </li>
                  {i < all.length - 1 && <ArrowRight aria-hidden className="mt-5 hidden h-4 w-4 shrink-0 text-fg-faint sm:block" />}
                </Fragment>
              ))}
          </ol>
        </div>
      )}
    </Panel>
  );
}
