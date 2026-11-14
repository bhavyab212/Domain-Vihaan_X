import { cn } from '@/lib/utils/cn';
import { SEVERITY_ORDER, SEVERITY_STYLE } from '@/lib/utils/severity';
import type { SecurityFinding, SeverityLevel } from '@/types';

interface SeverityStripProps {
  /** Findings after every filter EXCEPT severity, so each count equals what clicking it would show. */
  findings: SecurityFinding[];
  value: SeverityLevel | 'ALL';
  onChange: (value: SeverityLevel | 'ALL') => void;
}

/**
 * Severity quick-filter. Counts are a plain tally of the loaded findings (not a computed score). Severities with
 * no findings are omitted to save space, except the active one.
 */
export function SeverityStrip({ findings, value, onChange }: SeverityStripProps) {
  const counts = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, 0])) as Record<SeverityLevel, number>;
  for (const f of findings) counts[f.severity] += 1;
  const shown = SEVERITY_ORDER.filter((s) => counts[s] > 0 || value === s);

  return (
    <div role="group" aria-label="Filter by severity" className="flex flex-wrap items-center gap-2 px-3 py-2.5">
      {shown.map((severity) => {
        const style = SEVERITY_STYLE[severity];
        const active = value === severity;
        return (
          <button
            key={severity}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? 'ALL' : severity)}
            className={cn(
              'flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs transition-colors',
              active ? style.chip : 'border-line bg-ink-900 text-fg-soft hover:border-line-strong hover:text-fg',
            )}
          >
            <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
            {style.label}
            <span className="tabular font-semibold">{counts[severity]}</span>
          </button>
        );
      })}
    </div>
  );
}
