import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { AlertOctagon } from 'lucide-react';
import { ProvenanceBadge } from '@/components/common/ProvenanceBadge';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import { SEVERITY_STYLE } from '@/lib/utils/severity';
import type { FindingFlowNode } from '../model';
import { NodeHandles } from './NodeHandles';

/**
 * Finding card: title, severity, scanner label, associated asset and provenance.
 * Dashed border distinguishes findings from assets at a glance. It never renders evidence text, secret
 * values or credentials; the full (masked) evidence lives in the Threats & Findings drawer.
 */
function FindingNodeImpl({ data, selected }: NodeProps<FindingFlowNode>) {
  const sev = data.severity ? SEVERITY_STYLE[data.severity] : null;
  return (
    <div
      data-testid="finding-node"
      data-on-path={data.onPath}
      className={cn(
        'relative h-full w-full overflow-hidden rounded-md border border-dashed bg-ink-900 px-3 py-2.5 text-left shadow-panel transition-[opacity,border-color,box-shadow]',
        selected ? 'border-signal ring-2 ring-signal/40' : 'border-sev-critical/40 hover:border-sev-critical/70',
        data.onPath && !selected && 'border-sev-critical/70',
        data.dim && 'opacity-40',
      )}
    >
      <NodeHandles />
      {sev && <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', sev.bar)} />}

      <div className="flex items-center gap-1.5 pl-1 text-2xs uppercase text-fg-muted">
        <AlertOctagon className="h-4 w-4 shrink-0 text-sev-critical" aria-hidden />
        <span className="whitespace-nowrap">Finding</span>
        {data.severity && <SeverityBadge severity={data.severity} className="ml-auto" />}
      </div>

      <p className="mt-1.5 line-clamp-2 pl-1 text-[13px] font-medium leading-snug text-fg">{data.label}</p>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-1">
        {data.scanner && <Badge>{data.scanner}</Badge>}
        {data.provenance && <ProvenanceBadge provenance={data.provenance} />}
      </div>
      {data.assetName && <p className="mt-1 truncate pl-1 text-2xs text-fg-muted">on {data.assetName}</p>}
    </div>
  );
}

export const FindingNode = memo(FindingNodeImpl);
