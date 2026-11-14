import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ChevronDown, ChevronRight, Link2 } from 'lucide-react';
import { AssetIcon } from '@/components/common/AssetIcon';
import { ProvenanceBadge } from '@/components/common/ProvenanceBadge';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import { ASSET_TYPE_LABEL, formatPercent, humanizeRelationship, titleCase } from '@/lib/utils/format';
import type { PathHop, StepFinding } from './pathModel';

const ROLE_LABEL = { entry: 'Entry point', intermediate: 'Intermediate step', target: 'Target asset' } as const;
const ROLE_TONE = { entry: 'signal', intermediate: 'neutral', target: 'critical' } as const;

function FindingLine({ finding }: { finding: StepFinding }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Link2 className="h-3.5 w-3.5 text-fg-faint" aria-hidden />
      <span className="text-fg-muted">Supporting finding:</span>
      {finding.severity && <SeverityBadge severity={finding.severity} />}
      <span className="text-fg-soft">{finding.title ?? finding.id}</span>
      {finding.provenance ? <ProvenanceBadge provenance={finding.provenance} /> : <Badge tone="neutral">Provenance not provided</Badge>}
    </div>
  );
}

/** One hop. The header is a real button: it reveals the evidence for exactly this step. */
function Hop({ hop, expanded, onToggle }: { hop: PathHop; expanded: boolean; onToggle: () => void }) {
  const panelId = `hop-evidence-${hop.stepNumber}`;
  const { asset, finding } = hop;
  return (
    <li data-testid="path-step" data-role={hop.role} data-step={hop.stepNumber}>
      <div className={cn('rounded-md border bg-ink-850', hop.isChokePoint ? 'border-sev-high/50' : 'border-line-strong')}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex w-full items-start gap-3 rounded-md p-4 text-left hover:bg-ink-800/50"
        >
          <span className="tabular mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-strong bg-ink-900 text-xs font-semibold text-fg">
            {hop.stepNumber}
          </span>
          <span className="min-w-0 flex-1 space-y-2">
            <span className="flex flex-wrap items-center gap-2">
              <Badge tone={ROLE_TONE[hop.role]}>{ROLE_LABEL[hop.role]}</Badge>
              {hop.isChokePoint && <Badge tone="warn">Choke point</Badge>}
              {hop.mitreTactic && <span className="text-xs text-fg-muted">{hop.mitreTactic}</span>}
            </span>
            <span className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-ink-900 text-signal">
                <AssetIcon type={asset.type} className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-fg">{asset.name}</span>
                {asset.type && (
                  <span className="block text-xs text-fg-muted">
                    {[ASSET_TYPE_LABEL[asset.type], asset.environment && titleCase(asset.environment)].filter(Boolean).join(' · ')}
                  </span>
                )}
              </span>
            </span>
            <span className="block text-sm leading-relaxed text-fg-soft">{hop.description}</span>
          </span>
          {expanded ? <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-fg-muted" aria-hidden /> : <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-fg-muted" aria-hidden />}
          <span className="sr-only">{expanded ? 'Hide' : 'Show'} evidence for step {hop.stepNumber}</span>
        </button>

        {expanded && (
          <div id={panelId} role="region" aria-label={`Evidence for step ${hop.stepNumber}`} className="space-y-3 border-t border-line px-4 py-3 text-xs" data-testid="hop-evidence">
            <dl className="space-y-2">
              {hop.technique && (
                <div>
                  <dt className="text-fg-muted">Technique (descriptive label, not a verified technique)</dt>
                  <dd className="mt-0.5 text-fg-soft">{hop.technique}</dd>
                </div>
              )}
              <div>
                <dt className="text-fg-muted">Asset</dt>
                <dd className="mt-0.5 text-fg-soft">
                  {asset.source === 'id-only' ? (
                    <>
                      <code className="font-mono">{asset.id}</code> (no inventory or graph record, so only the id is known)
                    </>
                  ) : (
                    <>
                      {[asset.criticality && `${titleCase(asset.criticality)} criticality`, asset.owner && `owner ${asset.owner}`].filter(Boolean).join(' · ') || 'No further detail supplied'}
                      <span className="text-fg-faint"> (from the {asset.source})</span>
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-fg-muted">How this step connects to the previous one</dt>
                <dd className="mt-0.5 text-fg-soft">
                  {hop.role === 'entry' ? (
                    'This is where the path begins.'
                  ) : hop.relationship ? (
                    <>
                      {humanizeRelationship(hop.relationship.relationship)}
                      <span className="mx-1.5 text-fg-faint">·</span>
                      <span className={hop.relationship.inferred ? 'text-signal' : 'text-[#8FA9FF]'}>{hop.relationship.inferred ? 'inferred' : 'recorded'}</span>
                      {hop.relationship.inferred && hop.relationship.confidence != null && ` · confidence ${formatPercent(hop.relationship.confidence)} (engine estimate)`}
                    </>
                  ) : (
                    'The graph reported no relationship for this hop.'
                  )}
                </dd>
              </div>
            </dl>

            {finding ? (
              <div className="space-y-2 border-t border-line pt-3">
                <FindingLine finding={finding} />
                {finding.scanner && <p className="text-fg-muted">Scanner label: <span className="text-fg-soft">{finding.scanner}</span></p>}
                {finding.source === 'id-only' && <p className="text-fg-muted">The path names this finding (<code className="font-mono">{finding.id}</code>) but no record of it was supplied.</p>}
                {finding.openable ? (
                  <Link to={`/threats?f=${encodeURIComponent(finding.id)}`} className="inline-block font-medium text-signal underline underline-offset-2">
                    Open this finding
                  </Link>
                ) : (
                  <p className="text-fg-faint">Not in the loaded findings list, so it cannot be opened in Threats &amp; Findings.</p>
                )}
              </div>
            ) : (
              <p className="border-t border-line pt-3 text-fg-muted">No finding is attached to this step.</p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/** Ordered hops, entry to target. Only one step's evidence is open at a time. */
export function KillChain({ hops }: { hops: PathHop[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ol className="space-y-0" aria-label="Potential attack path, step by step">
      {hops.map((hop, i) => (
        <Fragment key={hop.stepNumber}>
          <Hop hop={hop} expanded={open === hop.stepNumber} onToggle={() => setOpen(open === hop.stepNumber ? null : hop.stepNumber)} />
          {i < hops.length - 1 && (
            <li aria-hidden className="flex justify-center py-1.5 text-fg-faint">
              <ArrowDown className="h-4 w-4" />
            </li>
          )}
        </Fragment>
      ))}
    </ol>
  );
}
