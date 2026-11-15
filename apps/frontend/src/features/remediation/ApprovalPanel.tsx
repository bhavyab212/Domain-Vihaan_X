import { useId, useRef, useState } from 'react';
import { FlaskConical, ShieldCheck, ShieldX } from 'lucide-react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { ApiError, approveRemediation } from '@/lib/api/client';
import type { DataOrigin, RemediationAction } from '@/types';
import { outcomeOf } from './lifecycle';
import { backendStateLabel, checkApprovalResponse, diffStats, filesFromDiff, placeholdersIn } from './remediationModel';

interface ApprovalPanelProps {
  remediation: RemediationAction;
  origin: DataOrigin;
  /** Called with the backend's own returned action, only after it has been validated. */
  onApproved: (updated: RemediationAction) => void;
}

const inputClass =
  'w-full rounded-md border border-line-strong bg-ink-950 px-3 text-sm text-fg placeholder:text-fg-faint hover:border-signal/50 focus-visible:ring-offset-0';

type Notice =
  | { kind: 'none' }
  | { kind: 'preview-only' }
  | { kind: 'error'; message: string }
  /** The backend answered, but did not move the remediation to an approved state. */
  | { kind: 'not-recorded'; backendState: string }
  | { kind: 'recorded'; backendState: string };

function failureMessage(error: ApiError): string {
  if (error.kind === 'unavailable') return 'The backend does not support approvals yet. Nothing was approved or changed.';
  if (error.kind === 'network' || error.kind === 'timeout') return 'The backend is unreachable. Nothing was approved or changed.';
  if (error.status === 409 || error.status === 412) {
    return 'This remediation changed on the backend after it was loaded. Nothing was approved. Reload and review the current version.';
  }
  if (error.status === 404) return 'The backend no longer has this remediation. Nothing was approved.';
  if (error.status === 422) return 'The backend rejected the approval details. Nothing was approved.';
  if (error.kind === 'parse') return 'The backend answered, but not in the documented format, so the result cannot be trusted. Nothing is shown as approved.';
  return 'The backend did not accept the approval. Nothing was changed.';
}

/**
 * Human approval gate (ADR-007). Approval is a REQUEST to the backend, never a local state change, and it is deliberate:
 * the form collects who and why, "Review and approve" opens a confirmation that spells out exactly what is being
 * approved, and only that confirmation sends anything.
 *  - API mode: POST /remediations/{id}/approve, the reply is validated, and only the backend's own state is shown.
 *  - Preview mode: nothing is ever sent. The confirmation says so.
 * Reject is shown but unavailable: the contract defines no reject operation, and a button that only changed local
 * state would be a fabricated decision.
 */
export function ApprovalPanel({ remediation, origin, onApproved }: ApprovalPanelProps) {
  const uid = useId();
  const [approver, setApprover] = useState('');
  const [comments, setComments] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice>({ kind: 'none' });
  const inFlight = useRef(false);
  const preview = origin === 'SIMULATED_DEMO';
  const outcome = outcomeOf(remediation);

  const files = filesFromDiff(remediation.patchDiff);
  const stats = diffStats(remediation.patchDiff);
  const placeholders = placeholdersIn(remediation.patchDiff);

  if (outcome !== 'awaiting-approval') {
    return (
      <div className="space-y-2">
        {notice.kind === 'recorded' && (
          <p role="status" data-testid="approval-recorded" className="rounded-md border border-line-strong bg-ink-900 px-3 py-2 text-xs leading-relaxed text-fg-soft">
            <span className="font-semibold text-fg">The backend recorded this.</span> It now reports <code className="font-mono">{notice.backendState}</code>.
            That is a recorded approval, not proof the change was applied or fixed anything.
          </p>
        )}
        <p className="text-sm leading-relaxed text-fg-muted">
          {outcome === 'rejected' ? 'This remediation was rejected. No approval is possible.' : 'An approval decision is already recorded for this remediation.'}
        </p>
      </div>
    );
  }

  const canReview = approver.trim().length > 0 && reviewed && !pending;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (canReview) setConfirming(true);
  }

  async function send() {
    // Duplicate-submission guard: a ref, not state, so two clicks in the same tick cannot both pass.
    if (inFlight.current) return;
    if (preview) {
      setConfirming(false);
      setNotice({ kind: 'preview-only' });
      return;
    }
    inFlight.current = true;
    setPending(true);
    try {
      const body: unknown = await approveRemediation(remediation.id, { approvedBy: approver.trim(), comments: comments.trim() || undefined });
      const check = checkApprovalResponse(remediation.id, body);
      if (!check.ok) {
        setNotice({
          kind: 'error',
          message:
            check.reason === 'wrong-record'
              ? 'The backend replied about a different remediation, so the result cannot be trusted. Nothing is shown as approved.'
              : 'The backend replied in an unrecognised shape, so the result cannot be trusted. Nothing is shown as approved.',
        });
      } else if (check.action.status === 'PENDING') {
        // 2xx but the backend still says PENDING: do NOT claim an approval happened.
        setNotice({ kind: 'not-recorded', backendState: backendStateLabel(check.action) });
      } else {
        setNotice({ kind: 'recorded', backendState: backendStateLabel(check.action) });
        onApproved(check.action);
      }
    } catch (e) {
      setNotice({ kind: 'error', message: failureMessage(e instanceof ApiError ? e : new ApiError('http', 'client', '')) });
    } finally {
      inFlight.current = false;
      setPending(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-3" aria-label="Human approval">
        <p className="text-xs leading-relaxed text-fg-muted">
          A person must review this patch before anything can change. Approving records your decision with the backend; it does not by itself
          prove the fix was applied or worked.
        </p>

        <div>
          <label htmlFor={`${uid}-who`} className="mb-1 block text-xs font-medium text-fg-soft">Approver</label>
          <input id={`${uid}-who`} className={`${inputClass} h-9`} value={approver} onChange={(e) => setApprover(e.target.value)} placeholder="Your name or ID" autoComplete="off" />
        </div>
        <div>
          <label htmlFor={`${uid}-why`} className="mb-1 block text-xs font-medium text-fg-soft">Rationale <span className="font-normal text-fg-faint">(optional)</span></label>
          <textarea id={`${uid}-why`} className={`${inputClass} min-h-[64px] py-2`} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Why this change is safe to apply" />
        </div>
        <label className="flex items-start gap-2 text-xs leading-relaxed text-fg-soft">
          <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 accent-sky-400" />
          I have reviewed the proposed patch and understand its effect.
        </label>

        {preview && (
          <p className="flex gap-2 rounded-md border border-sim/30 bg-sim/[0.08] px-3 py-2 text-xs leading-relaxed text-sim">
            <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Local preview: nothing is sent to the backend and nothing changes. It only demonstrates the approval step.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" disabled={!canReview}>
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {preview ? 'Review (preview)' : 'Review and approve'}
          </Button>
          {/* Honest, inert: the contract has no reject operation, so a working-looking button would fabricate a decision. */}
          <Button type="button" variant="secondary" disabled aria-describedby={`${uid}-reject`} title="Not supported by the backend contract yet">
            <ShieldX className="h-4 w-4" aria-hidden />
            Reject
          </Button>
        </div>
        <p id={`${uid}-reject`} className="text-2xs leading-relaxed text-fg-faint">
          Reject is unavailable: the backend contract defines approve but no reject operation. Closing this page without approving leaves the
          remediation awaiting approval.
        </p>

        {notice.kind === 'preview-only' && (
          <p role="status" data-testid="approval-preview-notice" className="rounded-md border border-line-strong bg-ink-900 px-3 py-2 text-xs leading-relaxed text-fg-soft">
            <span className="font-semibold text-fg">Preview only.</span> No request was sent and no remediation was applied. The status remains “Awaiting approval”.
          </p>
        )}
        {notice.kind === 'not-recorded' && (
          <p role="alert" data-testid="approval-not-recorded" className="rounded-md border border-sev-high/30 bg-sev-high/10 px-3 py-2 text-xs leading-relaxed text-sev-high">
            The backend answered, but still reports <code className="font-mono">{notice.backendState}</code>. No approval was recorded.
          </p>
        )}
        {notice.kind === 'error' && (
          <p role="alert" className="rounded-md border border-sev-critical/30 bg-sev-critical/10 px-3 py-2 text-xs leading-relaxed text-sev-critical">
            {notice.message}
          </p>
        )}
      </form>

      <ConfirmDialog
        open={confirming}
        title={preview ? 'Preview this approval?' : 'Approve this remediation?'}
        confirmLabel={preview ? 'Got it' : 'Approve remediation'}
        pendingLabel="Sending approval..."
        pending={pending}
        onConfirm={() => void send()}
        onCancel={() => setConfirming(false)}
      >
        <p className="font-medium text-fg">{remediation.title}</p>
        <dl className="space-y-1 text-xs">
          <div className="flex gap-2"><dt className="shrink-0 text-fg-muted">Scope</dt><dd className="min-w-0 break-words text-fg-soft">{files.length > 0 ? files.join(', ') : 'No file paths in the patch'}</dd></div>
          <div className="flex gap-2"><dt className="shrink-0 text-fg-muted">Change</dt><dd className="text-fg-soft"><span className="tabular">+{stats.added}</span> / <span className="tabular">−{stats.removed}</span> lines</dd></div>
          <div className="flex gap-2"><dt className="shrink-0 text-fg-muted">Approver</dt><dd className="min-w-0 break-words text-fg-soft">{approver.trim()}</dd></div>
        </dl>
        {placeholders.length > 0 && (
          <p className="rounded-md border border-sev-high/30 bg-sev-high/10 px-3 py-2 text-xs leading-relaxed text-sev-high">
            This patch contains placeholders a person must complete before it can be real: <span className="font-mono">{placeholders.join(', ')}</span>.
          </p>
        )}
        {preview ? (
          <p className="text-xs leading-relaxed text-fg-muted">
            You are viewing local preview data. <strong className="text-fg">No request will be sent and nothing will change.</strong>
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-fg-muted">
            This records your approval with the backend. It does <strong className="text-fg">not</strong> prove the change was applied or that the risk is gone; that
            is established only by a verified re-assessment.
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
