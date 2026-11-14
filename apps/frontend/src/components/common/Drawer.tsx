import { useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useDialogBehavior } from '@/hooks/useDialogBehavior';
import { cn } from '@/lib/utils/cn';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Detail drawer. Accessible modal dialog: focus moves in, Tab is trapped, Escape closes, and focus is restored to the
 * opener on close. It slides from the right edge on wide screens and fills the viewport below `sm` (a 390px phone gets
 * the full width rather than a cramped panel). No bottom dock.
 */
export function Drawer({ open, onClose, title, subtitle, children, className }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogBehavior(open, panelRef, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end" data-testid="drawer-root">
      <button
        type="button"
        aria-label="Close details"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink-950/60"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative flex h-full w-full max-w-xl animate-slide-in flex-col border-l border-line-strong bg-ink-900 shadow-drawer outline-none',
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-snug text-fg">{title}</h2>
            {subtitle && <div className="mt-1.5 flex flex-wrap items-center gap-2">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            data-autofocus
            className="-mr-1 rounded-md p-1.5 text-fg-muted hover:bg-ink-800 hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
