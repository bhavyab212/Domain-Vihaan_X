import { AlertTriangle, CheckCircle2, FlaskConical, X } from 'lucide-react';
// (FlaskConical is also used by the preview banner below)
import { useDataSource } from '@/app/providers/DataSourceProvider';
import { useDemoReset } from '@/app/providers/DemoResetProvider';
import { PREVIEW_SCENARIO } from '@/mocks/fixtures';
import { cn } from '@/lib/utils/cn';

/** Always-visible honesty strip while viewing local fixtures. */
export function DataOriginBanner() {
  const { mode, setMode } = useDataSource();
  if (mode !== 'preview') return null;
  return (
    <div
      role="note"
      data-testid="preview-banner"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-sim/25 bg-sim/[0.07] px-4 py-2 text-xs text-sim lg:px-6"
    >
      <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 leading-relaxed">
        <span className="font-semibold">Local preview data: {PREVIEW_SCENARIO.provenance}.</span>{' '}
        <span className="text-sim/90">
          Synthetic example records from the documented demo scenario. Not scanner output and not live monitoring.
        </span>
      </p>
      <button type="button" onClick={() => setMode('api')} className="font-medium underline underline-offset-2 hover:text-fg">
        Use backend data
      </button>
    </div>
  );
}

/** Result of the last reset attempt. Success appears ONLY after a backend-confirmed 2xx. */
export function ResetFeedback() {
  const { phase, message, dismiss } = useDemoReset();
  if (phase === 'idle' || phase === 'pending') return null;
  const ok = phase === 'success';
  const preview = phase === 'preview';
  return (
    <div
      role={ok || preview ? 'status' : 'alert'}
      data-testid="reset-feedback"
      data-phase={phase}
      className={cn(
        'flex items-center gap-2.5 border-b px-4 py-2 text-xs lg:px-6',
        ok && 'border-ok/30 bg-ok/10 text-ok',
        preview && 'border-sim/30 bg-sim/[0.08] text-sim',
        !ok && !preview && 'border-sev-critical/30 bg-sev-critical/10 text-sev-critical',
      )}
    >
      {ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
      ) : preview ? (
        <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
      )}
      <p className="min-w-0 flex-1">{message}</p>
      <button type="button" onClick={dismiss} aria-label="Dismiss message" className="rounded p-1 hover:bg-white/10">
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
