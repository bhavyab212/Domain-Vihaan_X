import { Check, Circle, Loader2, Minus, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { RemediationAction } from '@/types';
import { stagesOf, type StageState } from './lifecycle';

/**
 * A completed stage is NEUTRAL, not green. Green means "verified remediated" and nothing else, and it is applied below
 * only to the Verified stage when the backend reports it done (which stagesOf produces only for APPLIED + PASSED).
 * Otherwise every remediation would show a green check on "Proposed", and an applied-but-unverified one a green
 * "Applied", which reads as success the backend has not established.
 */
const VERIFIED_DONE = 'border-ok/50 bg-ok/15 text-ok';

const ICON_STYLE: Record<StageState, string> = {
  done: 'border-fg-faint bg-ink-800 text-fg',
  current: 'border-signal/60 bg-signal/15 text-signal',
  pending: 'border-line-strong bg-ink-900 text-fg-faint',
  failed: 'border-sev-critical/60 bg-sev-critical/15 text-sev-critical',
  skipped: 'border-line bg-ink-900 text-fg-faint',
};

const STATE_WORD: Record<StageState, string> = {
  done: 'Complete',
  current: 'Current',
  pending: 'Pending',
  failed: 'Failed',
  skipped: 'Not run',
};

function StageIcon({ state }: { state: StageState }) {
  const cls = 'h-3.5 w-3.5';
  if (state === 'done') return <Check className={cls} aria-hidden />;
  if (state === 'failed') return <X className={cls} aria-hidden />;
  if (state === 'skipped') return <Minus className={cls} aria-hidden />;
  if (state === 'current') return <Loader2 className={cls} aria-hidden />;
  return <Circle className="h-2.5 w-2.5" aria-hidden />;
}

/** Four-stage lifecycle. The "current" icon is static, not a spinner: nothing here is running in the browser. */
export function LifecycleStepper({ remediation }: { remediation: RemediationAction }) {
  const stages = stagesOf(remediation);
  return (
    <ol className="space-y-0" aria-label="Remediation lifecycle">
      {stages.map((stage, index) => (
        <li key={stage.id} className="relative flex gap-3 pb-4 last:pb-0" data-stage={stage.id} data-state={stage.state}>
          {index < stages.length - 1 && <span aria-hidden className="absolute bottom-0 left-[13px] top-7 w-px bg-line-strong" />}
          <span
            className={cn(
              'relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
              stage.id === 'verified' && stage.state === 'done' ? VERIFIED_DONE : ICON_STYLE[stage.state],
            )}
          >
            <StageIcon state={stage.state} />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-medium text-fg">
              {stage.label}
              <span className="ml-2 text-2xs font-normal uppercase text-fg-muted">{STATE_WORD[stage.state]}</span>
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{stage.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
