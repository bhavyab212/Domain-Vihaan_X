import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils/cn';
import { SEVERITY_ORDER, SEVERITY_STYLE } from '@/lib/utils/severity';
import type { SeverityLevel } from '@/types';
import type { Posture } from './posture';

function Kpi({ label, value, to, children, tone, unavailable, testId }: { label: string; value: ReactNode; to: string; children?: ReactNode; tone?: 'critical'; unavailable?: boolean; testId: string }) {
  return (
    <Link
      to={to}
      data-testid={testId}
      className="group block rounded-lg border border-line bg-ink-850 p-4 shadow-panel transition-colors hover:border-signal/50"
    >
      <p className="text-2xs uppercase text-fg-muted">{label}</p>
      <p className={cn('tabular mt-1.5 text-3xl font-semibold leading-none', unavailable ? 'text-fg-faint' : tone === 'critical' ? 'text-sev-critical' : 'text-fg')}>{value}</p>
      <div className="mt-2 min-h-[32px] text-xs leading-relaxed text-fg-muted">{children}</div>
    </Link>
  );
}

function SeverityRow({ counts }: { counts: Record<SeverityLevel, number> }) {
  const shown = SEVERITY_ORDER.filter((s) => counts[s] > 0);
  if (shown.length === 0) return <span>none open</span>;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {shown.map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', SEVERITY_STYLE[s].dot)} />
          <span className="tabular font-medium text-fg-soft">{counts[s]}</span> {SEVERITY_STYLE[s].label}
        </span>
      ))}
    </span>
  );
}

/**
 * Four KPI tiles. Each is a count of records a data source returned and links to the filtered view that lists exactly
 * those records. "Unavailable" is shown as an em dash with an explanation, never as 0, because 0 would claim the
 * backend answered "none".
 */
export function KpiGrid({ posture }: { posture: Posture }) {
  const { assets, findings, paths, remediations, remediationTotal } = posture;
  const openCritical = findings.openBySeverity.CRITICAL;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label="Security posture counts">
      <Kpi label="Assets" value={assets.count} to="/graph" testId="kpi-assets">
        {assets.inventoryEmptyButGraphHasAssets ? 'Named by the graph. The asset inventory returned none.' : 'Registered in the inventory.'}
      </Kpi>

      <Kpi
        label="Open findings"
        value={findings.listEmptyButGraphReportsFindings ? '—' : findings.openTotal}
        to={openCritical > 0 ? '/threats?severity=CRITICAL' : '/threats'}
        tone={openCritical > 0 ? 'critical' : undefined}
        unavailable={findings.listEmptyButGraphReportsFindings}
        testId="kpi-findings"
      >
        {findings.listEmptyButGraphReportsFindings ? (
          <>The findings list is empty, but the graph reports {findings.graphReportedCount} on assets. No breakdown is invented.</>
        ) : (
          <SeverityRow counts={findings.openBySeverity} />
        )}
      </Kpi>

      <Kpi
        label="Potential attack paths"
        value={paths ? paths.total : '—'}
        to="/paths"
        tone={paths && paths.bySeverity.CRITICAL > 0 ? 'critical' : undefined}
        unavailable={!paths}
        testId="kpi-paths"
      >
        {paths ? `${paths.active} open. Inferred, not confirmed exploits.` : 'Not available from the backend yet.'}
      </Kpi>

      <Kpi label="Remediations" value={remediationTotal ?? '—'} to="/remediation" unavailable={remediationTotal === null} testId="kpi-remediations">
        {remediations === null ? (
          'Not available from the backend yet.'
        ) : remediationTotal === 0 ? (
          'None proposed.'
        ) : (
          <span>
            <span className="tabular font-medium text-fg-soft">{remediations['awaiting-approval']}</span> awaiting approval ·{' '}
            <span className="tabular font-medium text-fg-soft">{remediations.verified}</span> verified
          </span>
        )}
      </Kpi>
    </div>
  );
}
