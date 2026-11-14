import { useId, useRef, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useDialogBehavior } from '@/hooks/useDialogBehavior';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** What will happen, in plain language. */
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Confirm button treatment: 'danger' for destructive or state-changing actions. */
  tone?: 'primary' | 'danger';
  /** While true the confirm button is disabled and shows progress (blocks double submit). */
  pending?: boolean;
  pendingLabel?: string;
  /** Extra condition that must hold before Confirm is enabled (e.g. a checkbox). */
  canConfirm?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Small modal that makes a state-changing action a DELIBERATE two-step: the user reads what will happen, then confirms.
 * Cancel is the initial focus target so an accidental Enter never confirms. Escape cancels. Focus is trapped and then
 * restored to the control that opened it.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'primary',
  pending = false,
  pendingLabel = 'Working...',
  canConfirm = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // While pending, Escape/backdrop must not abandon an in-flight request's UI.
  useDialogBehavior(open, panelRef, () => {
    if (!pending) onCancel();
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="confirm-dialog-root">
      <div aria-hidden onClick={() => !pending && onCancel()} className="absolute inset-0 bg-ink-950/75" />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-lg border border-line-strong bg-ink-900 p-5 shadow-drawer outline-none"
      >
        <h2 id={titleId} className="text-base font-semibold text-fg">
          {title}
        </h2>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-fg-soft">{children}</div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button data-autofocus variant="secondary" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={pending || !canConfirm}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
