import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { AssetIcon } from '@/components/common/AssetIcon';
import { ProvenanceBadge } from '@/components/common/ProvenanceBadge';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import { formatUtc, titleCase } from '@/lib/utils/format';
import type { DigitalAsset, SecurityFinding } from '@/types';
import { categoryOf } from './categories';
import type { Sort, SortKey } from './triage';

interface FindingsTableProps {
  findings: SecurityFinding[];
  assets: Record<string, DigitalAsset>;
  sort: Sort;
  onSort: (key: SortKey) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_TONE: Record<SecurityFinding['status'], 'neutral' | 'signal' | 'ok'> = {
  OPEN: 'neutral',
  IN_REMEDIATION: 'signal',
  // Green is reserved for verified outcomes; a finding marked resolved is only a status the backend reported.
  RESOLVED: 'neutral',
  ACCEPTED_RISK: 'neutral',
};

function SortHeader({ label, sortKey, sort, onSort, className }: { label: string; sortKey: SortKey; sort: Sort; onSort: (k: SortKey) => void; className?: string }) {
  const active = sort.key === sortKey;
  const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={ariaSort} className={cn('px-3 py-2 font-medium', className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn('-mx-1 inline-flex items-center gap-1.5 rounded px-1 py-0.5 uppercase hover:text-fg', active ? 'text-fg' : 'text-fg-muted')}
      >
        {label}
        <Icon className={cn('h-3 w-3', active ? 'text-signal' : 'text-fg-faint')} aria-hidden />
      </button>
    </th>
  );
}

const plainHeader = 'px-3 py-2 font-medium text-fg-muted';

/** Dense, sticky-header findings table. Horizontal scroll on narrow screens rather than clipping. */
export function FindingsTable({ findings, assets, sort, onSort, selectedId, onSelect }: FindingsTableProps) {
  return (
    <div className="max-h-[calc(100vh-22rem)] min-h-[200px] overflow-auto">
      <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
        <caption className="sr-only">
          Security findings. Column headers with buttons sort the table. Select a row to open its details.
        </caption>
        <thead className="sticky top-0 z-10 bg-ink-850 text-2xs uppercase shadow-[0_1px_0_0_#1A2740]">
          <tr>
            <SortHeader label="Severity" sortKey="severity" sort={sort} onSort={onSort} className="pl-4" />
            <SortHeader label="Finding" sortKey="title" sort={sort} onSort={onSort} />
            <th scope="col" className={plainHeader}>Category</th>
            <th scope="col" className={plainHeader}>Asset</th>
            <SortHeader label="Source" sortKey="scanner" sort={sort} onSort={onSort} />
            <th scope="col" className={plainHeader}>Status</th>
            <th scope="col" className={plainHeader}>Provenance</th>
            <SortHeader label="Discovered" sortKey="discovered" sort={sort} onSort={onSort} className="pr-4" />
          </tr>
        </thead>
        <tbody>
          {findings.map((f) => {
            const asset = assets[f.assetId];
            const selected = f.id === selectedId;
            return (
              <tr
                key={f.id}
                data-testid="finding-row"
                data-finding-id={f.id}
                aria-selected={selected}
                onClick={() => onSelect(f.id)}
                className={cn(
                  'cursor-pointer border-b border-line transition-colors last:border-b-0',
                  selected ? 'bg-signal/[0.07]' : 'hover:bg-ink-800/70',
                )}
              >
                <td className="py-2.5 pl-4 pr-3 align-top">
                  <SeverityBadge severity={f.severity} />
                </td>
                <td className="max-w-[360px] px-3 py-2.5 align-top">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(f.id);
                    }}
                    className="text-left font-medium leading-snug text-fg hover:text-signal"
                  >
                    {f.title}
                  </button>
                  {f.location?.file && (
                    <p className="mt-0.5 truncate font-mono text-2xs text-fg-faint" title={f.location.file}>
                      {f.location.file}
                      {f.location.line != null && `:${f.location.line}`}
                    </p>
                  )}
                  {!f.location?.file && f.location?.resource && (
                    <p className="mt-0.5 truncate font-mono text-2xs text-fg-faint" title={f.location.resource}>
                      {f.location.resource}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2.5 align-top text-xs text-fg-soft">{categoryOf(f.scanner)}</td>
                <td className="px-3 py-2.5 align-top">
                  <span className="flex items-center gap-2 text-xs text-fg-soft">
                    <AssetIcon type={asset?.type} className="h-3.5 w-3.5 shrink-0 text-fg-faint" />
                    <span className="truncate">{asset?.name ?? f.assetId}</span>
                  </span>
                </td>
                <td className="px-3 py-2.5 align-top">
                  <Badge>{f.scanner}</Badge>
                </td>
                <td className="px-3 py-2.5 align-top">
                  <Badge tone={STATUS_TONE[f.status]}>{titleCase(f.status)}</Badge>
                </td>
                <td className="px-3 py-2.5 align-top">
                  <ProvenanceBadge provenance={f.provenance} />
                </td>
                <td className="tabular whitespace-nowrap py-2.5 pl-3 pr-4 align-top text-xs text-fg-muted">{formatUtc(f.discoveredAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
