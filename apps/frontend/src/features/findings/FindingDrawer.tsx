import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FileCode2, FlaskConical, Lightbulb, Wrench } from 'lucide-react';
import { AssetIcon } from '@/components/common/AssetIcon';
import { Drawer } from '@/components/common/Drawer';
import { ProvenanceBadge } from '@/components/common/ProvenanceBadge';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { Badge } from '@/components/ui/Badge';
import { ASSET_TYPE_LABEL, formatUtc, titleCase } from '@/lib/utils/format';
import { isSimulatedProvenance, type DigitalAsset, type FindingEvidence, type SecurityFinding } from '@/types';
import { categoryOf } from './categories';

interface FindingDrawerProps {
  finding: SecurityFinding | null;
  asset: DigitalAsset | undefined;
  evidence: FindingEvidence | null;
  onClose: () => void;
  /** Position within the currently visible (filtered, sorted) list; enables previous/next navigation. */
  position?: { index: number; total: number };
  onPrevious?: () => void;
  onNext?: () => void;
}

function FindingNav({ position, onPrevious, onNext }: { position: { index: number; total: number }; onPrevious?: () => void; onNext?: () => void }) {
  const only = position.total <= 1;
  return (
    <nav aria-label="Finding navigation" className="mb-4 flex items-center justify-between rounded-md border border-line bg-ink-850 px-2 py-1.5 text-xs text-fg-muted">
      <button
        type="button"
        onClick={onPrevious}
        disabled={only}
        aria-label="Previous finding"
        className="flex items-center gap-1 rounded px-2 py-1 hover:bg-ink-800 hover:text-fg disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Previous
      </button>
      <span className="tabular" aria-live="polite">
        Finding {position.index + 1} of {position.total} <span className="text-fg-faint">(j / k)</span>
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={only}
        aria-label="Next finding"
        className="flex items-center gap-1 rounded px-2 py-1 hover:bg-ink-800 hover:text-fg disabled:pointer-events-none disabled:opacity-40"
      >
        Next <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    </nav>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-2xs uppercase text-fg-muted">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function ProvenanceNote({ finding }: { finding: SecurityFinding }) {
  if (isSimulatedProvenance(finding.provenance)) {
    return (
      <p className="rounded-md border border-sim/30 bg-sim/[0.08] px-3 py-2 text-xs leading-relaxed text-sim">
        <span className="font-semibold">Simulated evidence.</span> This finding comes from the synthetic demo scenario. No scanner
        observed it, and it must not be read as a real scan result.
      </p>
    );
  }
  if (finding.provenance === 'OBSERVED') {
    return (
      <p className="rounded-md border border-signal/30 bg-signal/[0.07] px-3 py-2 text-xs leading-relaxed text-signal">
        <span className="font-semibold">Observed.</span> Reported by the “{finding.scanner}” scanner run, as recorded by the backend.
      </p>
    );
  }
  return (
    <p className="rounded-md border border-line-strong bg-ink-850 px-3 py-2 text-xs leading-relaxed text-fg-soft">
      <span className="font-semibold">Inferred.</span> Derived by correlation rather than directly observed by a scanner.
    </p>
  );
}

export function FindingDrawer({ finding, asset, evidence, onClose, position, onPrevious, onNext }: FindingDrawerProps) {
  return (
    <Drawer
      open={finding !== null}
      onClose={onClose}
      title={finding?.title ?? ''}
      subtitle={
        finding && (
          <>
            <SeverityBadge severity={finding.severity} />
            <ProvenanceBadge provenance={finding.provenance} />
            <Badge>{categoryOf(finding.scanner)}</Badge>
          </>
        )
      }
    >
      {finding && (
        <div className="space-y-6">
          {position && position.total > 0 && (
            <div className="-mb-2">
              <FindingNav position={position} onPrevious={onPrevious} onNext={onNext} />
            </div>
          )}
          <ProvenanceNote finding={finding} />

          <p className="text-sm leading-relaxed text-fg-soft">{finding.description}</p>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
            <div>
              <dt className="text-fg-muted">Scanner label</dt>
              <dd className="mt-0.5 font-mono text-fg">{finding.scanner}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Status</dt>
              <dd className="mt-0.5 text-fg">{titleCase(finding.status)}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">CVSS</dt>
              <dd className="mt-0.5 text-fg">{finding.cvssScore != null ? finding.cvssScore.toFixed(1) : 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">CVE</dt>
              <dd className="mt-0.5 text-fg">{finding.cveId ?? 'None provided'}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Discovered</dt>
              <dd className="mt-0.5 text-fg">{formatUtc(finding.discoveredAt)}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">Finding ID</dt>
              <dd className="mt-0.5 font-mono text-fg">{finding.id}</dd>
            </div>
          </dl>

          <Section title="Associated asset" icon={<AssetIcon type={asset?.type} className="h-3.5 w-3.5" />}>
            {asset ? (
              <div className="rounded-md border border-line bg-ink-850 px-3 py-2.5 text-xs">
                <p className="text-sm font-medium text-fg">{asset.name}</p>
                <p className="mt-0.5 text-fg-muted">
                  {ASSET_TYPE_LABEL[asset.type]} · {titleCase(asset.environment)} · criticality {titleCase(asset.criticality)} · owner {asset.owner}
                </p>
              </div>
            ) : (
              <p className="text-xs text-fg-muted">Asset “{finding.assetId}” is not in the loaded inventory.</p>
            )}
          </Section>

          <Section title="Evidence & provenance" icon={<FileCode2 className="h-3.5 w-3.5" aria-hidden />}>
            {finding.location?.file && (
              <p className="text-xs text-fg-muted">
                File:{' '}
                <code className="font-mono text-fg-soft">
                  {finding.location.file}
                  {finding.location.line != null && `:${finding.location.line}`}
                </code>
              </p>
            )}
            {finding.location?.resource && (
              <p className="text-xs text-fg-muted">
                Resource: <code className="font-mono text-fg-soft">{finding.location.resource}</code>
              </p>
            )}
            {evidence ? (
              <figure className="overflow-hidden rounded-md border border-line bg-ink-950">
                <figcaption className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5 text-2xs uppercase text-sim">
                  <span className="inline-flex items-center gap-1.5">
                    <FlaskConical className="h-3 w-3" aria-hidden /> Simulated excerpt
                  </span>
                  <span className="truncate font-mono normal-case text-fg-faint">{evidence.sourceFile}</span>
                </figcaption>
                <pre className="overflow-x-auto px-3 py-2 text-xs leading-5 text-fg-soft">{evidence.excerpt.join('\n')}</pre>
                <p className="border-t border-line px-3 py-1.5 text-2xs text-fg-muted">{evidence.note}</p>
              </figure>
            ) : (
              <p className="text-xs text-fg-muted">The API does not provide an evidence excerpt for this finding.</p>
            )}
          </Section>

          <Section title="Remediation guidance" icon={<Lightbulb className="h-3.5 w-3.5" aria-hidden />}>
            <p className="text-sm leading-relaxed text-fg-soft">
              {finding.remediationGuidance ?? 'No remediation guidance was supplied for this finding.'}
            </p>
            <Link
              to="/remediation"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-signal underline underline-offset-2"
            >
              <Wrench className="h-3.5 w-3.5" aria-hidden />
              Open in Remediation Studio
            </Link>
          </Section>
        </div>
      )}
    </Drawer>
  );
}
