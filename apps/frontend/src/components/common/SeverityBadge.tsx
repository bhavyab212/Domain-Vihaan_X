import { SEVERITY_STYLE } from '@/lib/utils/severity';
import { cn } from '@/lib/utils/cn';
import type { SeverityLevel } from '@/types';

/** Severity is always a colour AND a text label, never colour alone. */
export function SeverityBadge({ severity, className }: { severity: SeverityLevel; className?: string }) {
  const style = SEVERITY_STYLE[severity];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-2xs font-semibold uppercase',
        style.chip,
        className,
      )}
    >
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {style.label}
    </span>
  );
}
