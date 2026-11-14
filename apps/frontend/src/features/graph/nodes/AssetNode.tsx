import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { FlaskConical, Target, UserCog } from 'lucide-react';
import { AssetIcon } from '@/components/common/AssetIcon';
import { cn } from '@/lib/utils/cn';
import { titleCase } from '@/lib/utils/format';
import { SEVERITY_STYLE } from '@/lib/utils/severity';
import type { AssetFlowNode } from '../model';
import { NodeHandles } from './NodeHandles';

function Glyph({ data }: { data: AssetFlowNode['data'] }) {
  if (data.graphType === 'IDENTITY') return <UserCog className="h-4 w-4" aria-hidden />;
  if (data.graphType === 'EXPLOIT_TARGET') return <Target className="h-4 w-4" aria-hidden />;
  return <AssetIcon type={data.assetType} className="h-4 w-4" />;
}

/**
 * Asset card: repository / cloud account / data store / identity / target.
 * Shows only what the data source supplied (environment, criticality and one metadata line when present).
 * Asset records carry no provenance field in the API contract, so the "Sim" mark reflects the data source
 * (local preview fixtures) rather than a per-asset claim.
 */
function AssetNodeImpl({ data, selected }: NodeProps<AssetFlowNode>) {
  const sev = data.severity ? SEVERITY_STYLE[data.severity] : null;
  return (
    <div
      data-testid="asset-node"
      data-asset-type={data.assetType ?? data.graphType}
      data-on-path={data.onPath}
      className={cn(
        'relative h-full w-full overflow-hidden rounded-md border bg-ink-850 px-3 py-2.5 text-left shadow-panel transition-[opacity,border-color,box-shadow]',
        selected ? 'border-signal ring-2 ring-signal/40' : 'border-line-strong hover:border-signal/60',
        data.onPath && !selected && 'border-sev-critical/60',
        data.dim && 'opacity-40',
      )}
    >
      <NodeHandles />
      {sev && <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', sev.bar)} />}

      <div className="flex items-center gap-1.5 pl-1 text-2xs uppercase text-fg-muted">
        <span className="shrink-0 text-signal">
          <Glyph data={data} />
        </span>
        <span className="whitespace-nowrap">{data.typeLabel}</span>
        {data.simulated && (
          <span title="Simulated demo data" className="shrink-0 text-sim">
            <FlaskConical className="h-3 w-3" aria-hidden />
            <span className="sr-only">Simulated demo data</span>
          </span>
        )}
        {sev && <span className={cn('ml-auto shrink-0 font-semibold', sev.text)}>{sev.label}</span>}
      </div>

      <p className="mt-1.5 line-clamp-2 pl-1 text-[13px] font-medium leading-snug text-fg">{data.label}</p>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-1 text-2xs text-fg-muted">
        {data.environment && <span>{titleCase(data.environment)}</span>}
        {data.criticality && (
          <span className={cn(data.criticality === 'CRITICAL' ? 'text-sev-critical' : 'text-fg-soft')}>
            {titleCase(data.criticality)} criticality
          </span>
        )}
      </div>
      {data.metaLine && <p className="mt-0.5 truncate pl-1 font-mono text-2xs text-fg-faint">{data.metaLine}</p>}
    </div>
  );
}

export const AssetNode = memo(AssetNodeImpl);
