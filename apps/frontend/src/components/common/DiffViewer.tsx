import { cn } from '@/lib/utils/cn';

type LineKind = 'add' | 'del' | 'hunk' | 'meta' | 'ctx';

function classify(line: string): LineKind {
  if (line.startsWith('+++') || line.startsWith('---')) return 'meta';
  if (line.startsWith('@@')) return 'hunk';
  if (line.startsWith('+')) return 'add';
  if (line.startsWith('-')) return 'del';
  return 'ctx';
}

const LINE_STYLE: Record<LineKind, string> = {
  add: 'bg-ok/10 text-ok',
  del: 'bg-sev-critical/10 text-sev-critical',
  hunk: 'bg-signal/5 text-signal',
  meta: 'text-fg-muted',
  ctx: 'text-fg-soft',
};

/**
 * Unified-diff renderer. Plain text only (React escapes everything), with +/- carried by the
 * leading character as well as colour, so the diff stays readable without colour perception.
 */
export function DiffViewer({ diff, label = 'Proposed patch' }: { diff: string; label?: string }) {
  const lines = diff.split('\n');
  return (
    <figure className="overflow-hidden rounded-md border border-line bg-ink-950">
      <figcaption className="border-b border-line px-3 py-1.5 text-2xs font-medium uppercase text-fg-muted">
        {label}
      </figcaption>
      <pre className="overflow-x-auto py-2 text-xs leading-5" aria-label={label}>
        {lines.map((line, index) => {
          const kind = classify(line);
          return (
            <div key={index} data-kind={kind} className={cn('whitespace-pre px-3', LINE_STYLE[kind])}>
              {line || ' '}
            </div>
          );
        })}
      </pre>
    </figure>
  );
}
