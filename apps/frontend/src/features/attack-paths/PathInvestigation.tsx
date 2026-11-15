import { Link } from 'react-router-dom';
import { Bot, Info, Network } from 'lucide-react';
import { ProvenanceBadge } from '@/components/common/ProvenanceBadge';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { Badge } from '@/components/ui/Badge';
import { formatPercent, formatUtc, titleCase } from '@/lib/utils/format';
import { KillChain } from './KillChain';
import type { PathModel } from './pathModel';

/** The page's most important honesty statement. It is rendered in the list AND at the top of every investigation. */
export function InferenceNotice({ simulated }: { simulated: boolean }) {
  return (
    <div role="note" className="flex gap-3 rounded-md border border-signal/30 bg-signal/[0.07] px-4 py-3" data-testid="inference-notice">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
      <div className="text-sm leading-relaxed text-fg-soft">
        <p className="font-semibold text-fg">Inferred potential path, not a confirmed exploit.</p>
        <p className="mt-0.5">
          This chain was derived by linking related findings and relationships. Nothing here was exploited or experimentally validated
          {simulated ? ', and the underlying scenario is simulated' : ''}. It describes how weaknesses could combine, not a breach in progress.
        </p>
      </div>
    </div>
  );
}

/**
 * AI analysis (TSK-015). No AI endpoint exists in the integrated OpenAPI contract, and the backend returns 404 for an
 * analysis route, so there is nothing real to display. This panel is deliberately inert: it makes NO request and
 * writes NO text of its own, because generated-looking prose with no evidence behind it would be fabrication.
 */
function AiAnalysisPanel() {
  return (
    <section aria-labelledby="ai-title" className="rounded-md border border-dashed border-line-strong bg-ink-900 p-4" data-testid="ai-analysis">
      <h3 id="ai-title" className="flex items-center gap-2 text-sm font-semibold text-fg">
        <Bot className="h-4 w-4 text-fg-muted" aria-hidden /> AI analysis
        <Badge tone="neutral">Not available</Badge>
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-fg-muted">
        The backend does not provide an AI analysis service yet, so no explanation is shown. The evidence above is the authoritative record. Once an
        analysis endpoint is published, its explanation will appear here labelled with its mode (language model or rule fallback), its evidence
        references and its uncertainty, and will never be presented as a confirmed fact.
      </p>
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-xs">
      <dt className="shrink-0 text-fg-muted">{label}</dt>
      <dd className="min-w-0 text-right text-fg">{children}</dd>
    </div>
  );
}

/** Body of the investigation drawer. Everything is rendered from the PathModel; nothing is computed here. */
export function PathInvestigation({ model }: { model: PathModel }) {
  const { path, chokePoint, target, remediations } = model;
  return (
    <div className="space-y-5" data-testid="path-investigation">
      <InferenceNotice simulated={path.isSimulated} />

      <section aria-label="Summary" className="space-y-3">
        <p className="text-sm leading-relaxed text-fg-soft">{path.summary}</p>
        <p className="text-2xs text-fg-faint">Summary text is supplied by the data source. The interface adds no analysis of its own.</p>
        <dl className="divide-y divide-line border-y border-line">
          <Fact label="Severity"><SeverityBadge severity={path.severity} /></Fact>
          <Fact label="Status">{path.status === 'ACTIVE' ? 'Open' : 'Mitigated'}</Fact>
          <Fact label="Confidence">
            <span className="tabular">{formatPercent(path.confidenceScore)}</span> <span className="text-fg-faint">engine estimate, not proof</span>
          </Fact>
          <Fact label="Nature">
            <span className="flex flex-wrap justify-end gap-1.5">
              <Badge tone="signal">Inferred</Badge>
              {path.isSimulated && <ProvenanceBadge provenance="SIMULATED_DEMO" />}
            </span>
          </Fact>
          <Fact label="Identified">{formatUtc(path.createdAt)}</Fact>
          {target && <Fact label="Target asset">{target.name}</Fact>}
        </dl>
      </section>

      <section aria-label="Kill chain" className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">Kill chain</h3>
          <p className="text-xs text-fg-muted">Entry point to target. Open a step to see its evidence.</p>
        </div>
        <KillChain hops={model.hops} />
      </section>

      <section aria-label="Choke point" className="rounded-md border border-line bg-ink-900 p-4">
        <h3 className="text-sm font-semibold text-fg">Choke point</h3>
        {chokePoint ? (
          <>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-soft">
              <span className="font-medium text-fg">{chokePoint.name}</span> was identified by the backend as the choke point.
            </p>
            <p className="mt-1.5 text-xs text-fg-muted">This is the backend's analysis. The interface does not compute it, and it is not verified until a re-assessment confirms it.</p>
          </>
        ) : (
          <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">The data source did not identify a choke point for this path. None is guessed.</p>
        )}
      </section>

      <section aria-label="Recommended next steps" className="space-y-2 rounded-md border border-line bg-ink-900 p-4">
        <h3 className="text-sm font-semibold text-fg">Next steps</h3>
        {remediations.length > 0 ? (
          <ul className="space-y-1.5 text-xs">
            {remediations.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <Link to={`/remediation?r=${encodeURIComponent(r.id)}`} className="font-medium text-signal underline underline-offset-2">
                  {r.title}
                </Link>
                <Badge tone="neutral">{titleCase(r.status)}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs leading-relaxed text-fg-muted">The backend has proposed no remediation for this path or its findings yet.</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-xs">
          <Link to={`/graph?path=${encodeURIComponent(path.id)}`} className="inline-flex items-center gap-1.5 font-medium text-signal underline underline-offset-2">
            <Network className="h-3.5 w-3.5" aria-hidden /> Show on graph
          </Link>
          <Link to="/threats" className="font-medium text-signal underline underline-offset-2">Review findings</Link>
        </div>
      </section>

      <AiAnalysisPanel />
    </div>
  );
}
