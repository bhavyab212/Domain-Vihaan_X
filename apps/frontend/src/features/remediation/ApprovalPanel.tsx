import { useId, useState } from 'react';
import { FlaskConical, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ApiError, approveRemediation } from '@/lib/api/client';
import type { DataOrigin, RemediationAction } from '@/types';
import { outcomeOf } from './lifecycle';

interface ApprovalPanelProps {
  remediation: RemediationAction;
  origin: DataOrigin;
  /** Called with the backend's returned action after a real approval. */
  onApproved: (updated: RemediationAction) => void;
}

const inputClass =
  'w-full rounded-md border border-line-strong bg-ink-950 px-3 text-sm text-fg placeholder:text-fg-faint hover:border-signal/50 focus-visible:ring-offset-0';

type Submit = { phase: 'idle' } | { phase: 'pending' } | { phase: 'error'; message: string } | { phase: 'preview-only' };

function failureMessage(error: ApiError): string {
  if (error.kind === 'unavailable') return 'The backend does not support approvals yet. Nothing was approved or changed.';
  if (error.kind === 'network' || error.kind === 'timeout') return 'The backend is unreachable. Nothing was approved or changed.';
  return 'The backend did not accept the approval. Nothing was changed.';
}

/**
 * Human approval gate (ADR-007). Approval is a request to the backend, never a local state change:
 *  - API mode: POST /remediations/{id}/approve, then show exactly what the backend returns.
 *  - Preview mode: nothing is sent and nothing changes. The panel says so.
 */
export function ApprovalPanel({ remediation, origin, onApproved }: ApprovalPanelProps) {
  const uid = useId();
  const [approver, setApprover] = useState('');
  const [comments, setComments] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [submit, setSubmit] = useState<Submit>({ phase: 'idle' });
  const preview = origin === 'SIMULATED_DEMO';
  const outcome = outcomeOf(remediation);

  if (outcome !== 'awaiting-approval') {
    return (
      <p className="text-sm leading-relaxed text-fg-muted">
        {outcome === 'rejected'
          ? 'This remediation was rejected. No approval is possible.'
          : 'An approval decision is already recorded for this remediation.'}
      </p>
    );
  }

  const canSubmit = approver.trim().length > 0 && reviewed && submit.phase !== 'pending';

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    if (preview) {
      setSubmit({ phase: 'preview-only' });
      return;
    }
    setSubmit({ phase: 'pending' });
    try {
      const updated = await approveRemediation(remediation.id, {
        approvedBy: approver.trim(),
        comments: comments.trim() || undefined,
      });
      setSubmit({ phase: 'idle' });
      onApproved(updated);
    } catch (e) {
      setSubmit({ phase: 'error', message: failureMessage(e instanceof ApiError ? e : new ApiError('http', 'client', '')) });
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3" aria-label="Human approval">
      <p className="text-xs leading-relaxed text-fg-muted">
        A person must review this patch before anything can change. Approving records your decision with the backend; it does not
        by itself prove the fix was applied or worked.
      </p>

      <div>
        <label htmlFor={`${uid}-who`} className="mb-1 block text-xs font-medium text-fg-soft">Approver</label>
        <input id={`${uid}-who`} className={`${inputClass} h-9`} value={approver} onChange={(e) => setApprover(e.target.value)} placeholder="Your name or ID" autoComplete="off" />
      </div>
      <div>
        <label htmlFor={`${uid}-why`} className="mb-1 block text-xs font-medium text-fg-soft">Comments <span className="font-normal text-fg-faint">(optional)</span></label>
        <textarea id={`${uid}-why`} className={`${inputClass} min-h-[64px] py-2`} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Why this change is safe to apply" />
      </div>
      <label className="flex items-start gap-2 text-xs leading-relaxed text-fg-soft">
        <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-sky-400" />
        I have reviewed the proposed patch and understand its effect.
      </label>

      {preview && (
        <p className="flex gap-2 rounded-md border border-sim/30 bg-sim/[0.08] px-3 py-2 text-xs leading-relaxed text-sim">
          <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Local preview: submitting sends nothing to the backend and changes nothing. It only demonstrates the approval step.
        </p>
      )}

      <Button type="submit" variant="primary" disabled={!canSubmit}>
        {submit.phase === 'pending' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
        {submit.phase === 'pending' ? 'Sending approval...' : preview ? 'Preview approval' : 'Approve remediation'}
      </Button>

      {submit.phase === 'preview-only' && (
        <p role="status" data-testid="approval-preview-notice" className="rounded-md border border-line-strong bg-ink-900 px-3 py-2 text-xs leading-relaxed text-fg-soft">
          <span className="font-semibold text-fg">Preview only.</span> No request was sent and no remediation was applied. The status
          remains “Awaiting approval”.
        </p>
      )}
      {submit.phase === 'error' && (
        <p role="alert" className="rounded-md border border-sev-critical/30 bg-sev-critical/10 px-3 py-2 text-xs leading-relaxed text-sev-critical">
          {submit.message}
        </p>
      )}
    </form>
  );
}
