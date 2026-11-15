import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { FlaskConical, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { titleCase } from '@/lib/utils/format';
import { SEVERITY_STYLE } from '@/lib/utils/severity';
import type { IdentityFlowNode } from '../model';
import { NodeHandles } from './NodeHandles';

/**
 * Identity card (IAM role, service account, ...). Rendered ONLY for graph nodes the payload itself marks
 * `type: "IDENTITY"`; the UI never promotes an asset to an identity. When the inventory record behind the node has
 * a different name from the node label, that real asset is shown too so the label cannot stand in for it.
 */
function IdentityNodeImpl({ data, selected }: NodeProps<IdentityFlowNode>) {
  const sev = data.severity ? SEVERITY_STYLE[data.severity] : null;
  return (
    <div
      data-testid="identity-node"
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
        <UserCog className="h-4 w-4 shrink-0 text-signal" aria-hidden />
        <span className="whitespace-nowrap">Identity</span>
        {data.simulated && (
          <span title="Simulated demo data" className="shrink-0 text-sim">
            <FlaskConical className="h-3 w-3" aria-hidden />
            <span className="sr-only">Simulated demo data</span>
          </span>
        )}
        {sev && <span className={cn('ml-auto shrink-0 font-semibold', sev.text)}>{sev.label}</span>}
      </div>

      <p className="mt-1.5 line-clamp-2 pl-1 text-[13px] font-medium leading-snug text-fg">{data.label}</p>

      {data.backingAsset && (
        <p className="mt-0.5 truncate pl-1 text-2xs text-fg-muted" title={`${data.backingAsset.typeLabel}: ${data.backingAsset.name}`}>
          in {data.backingAsset.typeLabel.toLowerCase()} {data.backingAsset.name}
        </p>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-1 text-2xs text-fg-muted">
        {data.environment && <span>{titleCase(data.environment)}</span>}
        {data.criticality && (
          <span className={cn(data.criticality === 'CRITICAL' ? 'text-sev-critical' : 'text-fg-soft')}>{titleCase(data.criticality)} criticality</span>
        )}
      </div>
      {data.owner && <p className="mt-0.5 truncate pl-1 text-2xs text-fg-muted">Owner: {data.owner}</p>}
    </div>
  );
}

export const IdentityNode = memo(IdentityNodeImpl);
