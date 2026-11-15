import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { titleCase } from '@/lib/utils/format';
import type { DigitalAsset, SecurityFinding } from '@/types';
import { CATEGORY_LABEL, type FindingCategory } from './categories';
import { activeFilterKeys, type FilterKey, type ProvenanceGroup, type TriageFilters } from './triage';

interface FilterBarProps {
  filters: TriageFilters;
  onChange: (patch: Partial<TriageFilters>) => void;
  onClearAll: () => void;
  scanners: string[];
  assets: DigitalAsset[];
  shown: number;
  total: number;
}

const selectClass =
  'h-8 min-w-0 rounded-md border border-line-strong bg-ink-950 px-2 text-xs text-fg hover:border-signal/50 focus-visible:ring-offset-0';

const PROVENANCE_LABEL: Record<ProvenanceGroup, string> = {
  SIMULATED: 'Simulated demo',
  OBSERVED: 'Observed',
  INFERRED: 'Inferred',
};
const STATUS_LABEL: Record<SecurityFinding['status'], string> = {
  OPEN: 'Open',
  IN_REMEDIATION: 'In remediation',
  RESOLVED: 'Resolved',
  ACCEPTED_RISK: 'Accepted risk',
};

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T | 'ALL';
  onChange: (v: T | 'ALL') => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-fg-muted">
      {label}
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value as T | 'ALL')}>
        <option value="ALL">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Human description of one active filter, for the removable chips. */
function chipLabel(key: FilterKey, filters: TriageFilters, assets: DigitalAsset[]): string {
  switch (key) {
    case 'query':
      return `Search: "${filters.query.trim()}"`;
    case 'severity':
      return `Severity: ${titleCase(filters.severity)}`;
    case 'scanner':
      return `Scanner: ${filters.scanner}`;
    case 'category':
      return `Category: ${CATEGORY_LABEL[filters.category as FindingCategory]}`;
    case 'asset':
      return `Asset: ${assets.find((a) => a.id === filters.asset)?.name ?? filters.asset}`;
    case 'status':
      return `Status: ${STATUS_LABEL[filters.status as SecurityFinding['status']]}`;
    case 'provenance':
      return `Provenance: ${PROVENANCE_LABEL[filters.provenance as ProvenanceGroup]}`;
  }
}

/** Search + compact dropdown filters + removable chips for whatever is active. */
export function FilterBar({ filters, onChange, onClearAll, scanners, assets, shown, total }: FilterBarProps) {
  const active = activeFilterKeys(filters);
  const reset: Record<FilterKey, Partial<TriageFilters>> = {
    query: { query: '' },
    severity: { severity: 'ALL' },
    scanner: { scanner: 'ALL' },
    category: { category: 'ALL' },
    asset: { asset: 'ALL' },
    status: { status: 'ALL' },
    provenance: { provenance: 'ALL' },
  };

  return (
    <div className="space-y-2.5 border-b border-line px-3 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint" aria-hidden />
          <input
            type="text"
            role="searchbox"
            value={filters.query}
            onChange={(e) => onChange({ query: e.target.value })}
            placeholder="Search title, description, asset, scanner, file or ID"
            aria-label="Search findings"
            className="h-9 w-full rounded-md border border-line-strong bg-ink-950 pl-8 pr-8 text-sm text-fg placeholder:text-fg-faint hover:border-signal/50 focus-visible:ring-offset-0"
          />
          {filters.query !== '' && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onChange({ query: '' })}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-fg-muted hover:bg-ink-800 hover:text-fg"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>

        <Select
          label="Scanner"
          value={filters.scanner}
          onChange={(scanner) => onChange({ scanner })}
          options={scanners.map((s) => ({ value: s, label: s }))}
        />
        <Select
          label="Asset"
          value={filters.asset}
          onChange={(asset) => onChange({ asset })}
          options={assets.map((a) => ({ value: a.id, label: a.name }))}
        />
        <Select
          label="Status"
          value={filters.status}
          onChange={(status) => onChange({ status })}
          options={(Object.keys(STATUS_LABEL) as SecurityFinding['status'][]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
        />
        <Select
          label="Provenance"
          value={filters.provenance}
          onChange={(provenance) => onChange({ provenance })}
          options={(Object.keys(PROVENANCE_LABEL) as ProvenanceGroup[]).map((p) => ({ value: p, label: PROVENANCE_LABEL[p] }))}
        />
        {/* Severity and category are filtered by the strip and the tabs above (real buttons, so keyboard-operable). */}
      </div>

      <div className="flex min-h-[26px] flex-wrap items-center gap-2">
        {active.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(reset[key])}
            aria-label={`Remove filter ${chipLabel(key, filters, assets)}`}
            className="flex items-center gap-1.5 rounded-md border border-signal/40 bg-signal/10 px-2 py-0.5 text-xs text-signal hover:bg-signal/20"
          >
            {chipLabel(key, filters, assets)}
            <X className="h-3 w-3" aria-hidden />
          </button>
        ))}
        {active.length > 0 && (
          <Button size="sm" variant="ghost" onClick={onClearAll} className="h-6 px-2">
            Clear all
          </Button>
        )}
        <p className="tabular ml-auto text-xs text-fg-muted" role="status" aria-live="polite" data-testid="result-count">
          {shown} of {total} {total === 1 ? 'finding' : 'findings'}
        </p>
      </div>
    </div>
  );
}
