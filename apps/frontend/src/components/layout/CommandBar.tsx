import { FlaskConical, RefreshCw, Server } from 'lucide-react';
import { useBackendStatus } from '@/app/providers/BackendStatusProvider';
import { useDataSource } from '@/app/providers/DataSourceProvider';
import { ResetDemoControl } from '@/components/common/ResetDemoControl';
import { formatClock } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { DataSourceMode } from '@/lib/config/env';
import { BrandMark } from './Sidebar';

function BackendIndicator() {
  const { status, health, error, lastCheckedAt, checking, refresh } = useBackendStatus();

  const label =
    status === 'connecting' ? 'Connecting...' : status === 'online' ? 'Backend online' : 'Backend unavailable';
  const dot =
    status === 'connecting' ? 'bg-sev-medium animate-pulse' : status === 'online' ? 'bg-ok' : 'bg-sev-critical';
  const detail =
    status === 'online'
      ? `API reports ${health?.mode === 'LIVE_ASSESSMENT_MODE' ? 'live assessment' : 'demo'} mode`
      : status === 'offline'
        ? error?.kind === 'unavailable'
          ? 'Health route not found'
          : 'No response from API'
        : 'Checking GET /health';

  return (
    <div className="flex items-center gap-2" data-testid="backend-status" data-status={status}>
      <div className="text-right leading-tight">
        <p className="flex items-center justify-end gap-1.5 text-xs font-medium text-fg">
          <span aria-hidden className={cn('h-2 w-2 rounded-full', dot)} />
          <span role="status">{label}</span>
        </p>
        <p className="text-2xs text-fg-faint">
          {detail}
          {lastCheckedAt && ` · checked ${formatClock(lastCheckedAt)}`}
        </p>
      </div>
      <button
        type="button"
        onClick={refresh}
        disabled={checking}
        aria-label="Re-check backend connection"
        className="rounded-md p-1.5 text-fg-muted hover:bg-ink-800 hover:text-fg disabled:opacity-50"
      >
        <RefreshCw className={cn('h-3.5 w-3.5', checking && 'animate-spin')} aria-hidden />
      </button>
    </div>
  );
}

const MODE_OPTIONS: { value: DataSourceMode; label: string; icon: typeof Server }[] = [
  { value: 'preview', label: 'Local preview', icon: FlaskConical },
  { value: 'api', label: 'Backend API', icon: Server },
];

function DataSourceSwitch() {
  const { mode, setMode } = useDataSource();
  return (
    <div role="group" aria-label="Data source" className="flex rounded-md border border-line-strong bg-ink-950 p-0.5">
      {MODE_OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => setMode(value)}
            className={cn(
              'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? value === 'preview'
                  ? 'bg-sim/15 text-sim'
                  : 'bg-signal/15 text-signal'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Top command bar: product context, data source, real backend health, and the demo reset action. */
export function CommandBar() {
  return (
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-ink-900/90 px-4 py-2 backdrop-blur lg:px-6">
      <div className="flex min-w-0 items-center gap-4">
        <div className="lg:hidden">
          <BrandMark />
        </div>
        <div className="hidden leading-tight lg:block">
          <p className="text-2xs uppercase text-fg-faint">Workspace</p>
          <p className="text-sm font-medium text-fg">Synthetic SaaS scenario</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <DataSourceSwitch />
        <BackendIndicator />
        <ResetDemoControl />
      </div>
    </header>
  );
}
