import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton h-4 w-full', className)} />;
}

/** Generic loading placeholder for a panel body. Announced once, not spun forever: errors replace it. */
export function PanelSkeleton({ rows = 4, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3 p-4">
      <span className="sr-only">{label}...</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={i % 3 === 2 ? 'w-2/3' : 'w-full'} />
      ))}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 px-6 py-10 text-center', className)}>
      <div className="text-fg-faint">{icon ?? <Inbox className="h-7 w-7" aria-hidden />}</div>
      <p className="text-sm font-medium text-fg">{title}</p>
      {description && <p className="max-w-sm text-xs leading-relaxed text-fg-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

function errorCopy(error: ApiError): { title: string; description: string; offline: boolean } {
  switch (error.kind) {
    case 'network':
    case 'timeout':
      return {
        title: 'Backend unreachable',
        description:
          'The control plane did not respond. Start the backend, or switch to the local preview data in the command bar.',
        offline: true,
      };
    case 'unavailable':
      return {
        title: 'Not available on the backend yet',
        description: 'The backend does not serve this data yet. This is expected while the API is being built.',
        offline: false,
      };
    case 'parse':
      return {
        title: 'Unexpected response',
        description: 'The backend answered, but not in the documented format, so nothing is shown.',
        offline: false,
      };
    default:
      return {
        title: 'Request failed',
        description: `The backend returned an error${error.status ? ` (HTTP ${error.status})` : ''}.`,
        offline: false,
      };
  }
}

/** Safe error display: a category and a retry. Never a stack trace or raw backend payload. */
export function ErrorState({ error, onRetry, className }: { error: ApiError; onRetry?: () => void; className?: string }) {
  const copy = errorCopy(error);
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center gap-2 px-6 py-10 text-center', className)}>
      <div className="text-sev-high">
        {copy.offline ? <WifiOff className="h-7 w-7" aria-hidden /> : <AlertTriangle className="h-7 w-7" aria-hidden />}
      </div>
      <p className="text-sm font-medium text-fg">{copy.title}</p>
      <p className="max-w-sm text-xs leading-relaxed text-fg-muted">{copy.description}</p>
      <p className="font-mono text-2xs text-fg-faint">{error.endpoint}</p>
      {onRetry && (
        <Button size="sm" className="mt-2" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Retry
        </Button>
      )}
    </div>
  );
}
