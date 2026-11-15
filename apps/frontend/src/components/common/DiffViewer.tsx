import { useMemo, useState } from 'react';
import { Check, Copy, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { redactSecrets } from '@/lib/utils/redact';

type LineKind = 'add' | 'del' | 'hunk' | 'meta' | 'ctx';

function classify(line: string): LineKind {
  if (line.startsWith('+++') || line.startsWith('---')) return 'meta';
  if (line.startsWith('@@')) return 'hunk';
  if (line.startsWith('+')) return 'add';
  if (line.startsWith('-')) return 'del';
  return 'ctx';
}

/**
 * Added lines are NOT green: this project reserves green for a verified remediation, and a green "+" on a proposal that
 * nothing has applied would read as success. Additions use the accent tint, removals a struck-through muted tint, and the
 * leading +/- character carries the meaning regardless of colour.
 */
const LINE_STYLE: Record<LineKind, string> = {
  add: 'bg-signal/10 text-fg',
  del: 'bg-ink-800 text-fg-muted line-through decoration-fg-faint',
  hunk: 'bg-signal/5 text-signal',
  meta: 'text-fg-muted',
  ctx: 'text-fg-soft',
};

/**
 * Unified-diff renderer. Plain text only (React escapes everything), with +/- carried by the leading character as
 * well as colour, so the diff stays readable without colour perception.
 *
 * SAFETY NET: the text is passed through `redactSecrets` before it is rendered or copied. The backend is expected to
 * send masked evidence already; this makes sure a raw credential that slips through still never reaches the screen,
 * a screenshot or the clipboard. When redaction changes anything, the viewer says so. The copy button copies the
 * redacted text, never the original.
 */
export function DiffViewer({ diff, label = 'Proposed patch' }: { diff: string; label?: string }) {
  const { text, redacted } = useMemo(() => {
    const safe = redactSecrets(diff);
    return { text: safe, redacted: safe !== diff };
  }, [diff]);
  const lines = text.split('\n');
  const [copied, setCopied] = useState<'idle' | 'ok' | 'failed'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied('ok');
    } catch {
      setCopied('failed');
    }
    window.setTimeout(() => setCopied('idle'), 2000);
  }

  return (
    <figure className="min-w-0 overflow-hidden rounded-md border border-line bg-ink-950">
      <figcaption className="flex items-center justify-between gap-3 border-b border-line px-3 py-1.5">
        <span className="text-2xs font-medium uppercase text-fg-muted">{label}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-2xs font-medium text-fg-muted hover:bg-ink-800 hover:text-fg"
          aria-label={copied === 'ok' ? 'Patch copied' : copied === 'failed' ? 'Copy failed' : 'Copy patch'}
        >
          {copied === 'ok' ? <Check className="h-3 w-3 text-ok" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
          {copied === 'ok' ? 'Copied' : copied === 'failed' ? 'Copy failed' : 'Copy'}
        </button>
      </figcaption>
      {redacted && (
        <p role="note" data-testid="diff-redacted" className="flex items-start gap-2 border-b border-sev-high/30 bg-sev-high/10 px-3 py-1.5 text-2xs leading-relaxed text-sev-high">
          <ShieldAlert className="mt-px h-3 w-3 shrink-0" aria-hidden />
          Secret-shaped values in this patch were hidden before display and will not be copied.
        </p>
      )}
      {/* tabIndex makes a horizontally scrollable region keyboard-reachable */}
      <pre className="overflow-x-auto py-2 text-xs leading-5" aria-label={label} tabIndex={0}>
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
