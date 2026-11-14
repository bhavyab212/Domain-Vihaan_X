import { Activity, FlaskConical, Server } from 'lucide-react';
import { useBackendStatus } from '@/app/providers/BackendStatusProvider';
import { useDataSource } from '@/app/providers/DataSourceProvider';
import { useDemoReset } from '@/app/providers/DemoResetProvider';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Panel';
import { cn } from '@/lib/utils/cn';
import { formatClock, formatUtc } from '@/lib/utils/format';
import { readScanners, scannerTone } from './posture';

const TONE: Record<ReturnType<typeof scannerTone>, BadgeTone> = { ok: 'ok', neutral: 'neutral', warn: 'warn' };

function Cell({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 space-y-1.5 px-4 py-3', className)}>
      <p className="text-2xs uppercase text-fg-muted">{label}</p>
      <div className="text-sm text-fg">{children}</div>
    </div>
  );
}

/**
 * Operating status, every field sourced and honest:
 *  - data source: what the UI is showing (local preview vs backend), not a hardcoded badge;
 *  - backend: the real /health result (connecting / online / unavailable), never green by default;
 *  - mode: the backend-reported `mode`, shown only while the backend is actually online;
 *  - scanners: exactly as /health reports them. "unverified" is NOT shown as healthy;
 *  - last reset: only a backend-CONFIRMED reset (its own resetAt), never a click or a timer.
 */
export function StatusStrip() {
  const { source } = useDataSource();
  const { status, health, lastCheckedAt } = useBackendStatus();
  const { lastConfirmed } = useDemoReset();
  const preview = source.origin === 'SIMULATED_DEMO';
  const scanners = readScanners(health?.scanners);

  return (
    <Panel aria-label="Operating status" data-testid="status-strip">
      <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        <Cell label="Data source">
          {preview ? (
            <span className="flex items-center gap-2 text-sim">
              <FlaskConical className="h-4 w-4" aria-hidden /> Local preview
            </span>
          ) : (
            <span className="flex items-center gap-2 text-signal">
              <Server className="h-4 w-4" aria-hidden /> Backend API
            </span>
          )}
          <p className="mt-1 text-xs text-fg-muted">{preview ? 'Synthetic fixtures. Not scanner output.' : 'Records returned by the control plane.'}</p>
        </Cell>

        <Cell label="Backend">
          <span className="flex items-center gap-2" data-testid="status-backend" data-status={status}>
            <span
              aria-hidden
              className={cn('h-2 w-2 rounded-full', status === 'online' ? 'bg-ok' : status === 'offline' ? 'bg-sev-critical' : 'animate-pulse bg-sev-medium')}
            />
            {status === 'connecting' ? 'Connecting...' : status === 'online' ? 'Online' : 'Unavailable'}
          </span>
          <p className="mt-1 text-xs text-fg-muted">
            {status === 'online'
              ? `Operating mode: ${health?.mode === 'LIVE_ASSESSMENT_MODE' ? 'live assessment' : 'demo'}`
              : status === 'offline'
                ? 'No usable response from GET /health'
                : 'Checking GET /health'}
            {lastCheckedAt && ` · checked ${formatClock(lastCheckedAt)}`}
          </p>
        </Cell>

        <Cell label="Scanners">
          {status !== 'online' ? (
            <span className="text-fg-muted">Unknown while the backend is {status === 'connecting' ? 'connecting' : 'unavailable'}</span>
          ) : scanners.length === 0 ? (
            <span className="text-fg-muted">Not reported by the backend</span>
          ) : (
            <ul className="flex flex-wrap gap-1.5" aria-label="Scanner readiness as reported by the backend">
              {scanners.map((s) => (
                <li key={s.name}>
                  <Badge tone={TONE[scannerTone(s.state)]} title={`${s.name}: ${s.state}`}>
                    {s.name} · {s.state}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Cell>

        <Cell label="Demo state">
          <p className="text-xs leading-relaxed text-fg-muted" data-testid="last-reset">
            {lastConfirmed ? (
              <>
                <Activity className="mr-1 inline h-3 w-3" aria-hidden />
                Backend confirmed a reset{lastConfirmed.resetAt ? ` at ${formatUtc(lastConfirmed.resetAt.toISOString())}` : ''}
                {lastConfirmed.walVerified ? '' : ' (WAL not verified)'}
              </>
            ) : (
              'No backend-confirmed reset in this session. Use "Reset demo" in the top bar.'
            )}
          </p>
        </Cell>
      </div>
    </Panel>
  );
}
