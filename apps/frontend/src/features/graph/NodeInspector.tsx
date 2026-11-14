import { Link } from 'react-router-dom';
import { MousePointerClick } from 'lucide-react';
import { ProvenanceBadge } from '@/components/common/ProvenanceBadge';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { EmptyState } from '@/components/common/States';
import { Badge } from '@/components/ui/Badge';
import { ASSET_TYPE_LABEL, formatPercent, humanizeRelationship, titleCase } from '@/lib/utils/format';
import type { DigitalAsset, GraphEdge, GraphNode, SecurityFinding, SecurityGraph } from '@/types';

interface NodeInspectorProps {
  node: GraphNode | null;
  graph: SecurityGraph;
  assets: Record<string, DigitalAsset>;
  findings: Record<string, SecurityFinding>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="shrink-0 text-xs text-fg-muted">{label}</dt>
      <dd className="min-w-0 text-right text-xs text-fg">{children}</dd>
    </div>
  );
}

/** Selected-node detail panel. Shows only fields the API/fixtures supply; nothing is derived here. */
export function NodeInspector({ node, graph, assets, findings }: NodeInspectorProps) {
  if (!node) {
    return (
      <EmptyState
        icon={<MousePointerClick className="h-6 w-6" aria-hidden />}
        title="Select a node"
        description="Choose an asset or finding on the graph to inspect its details and relationships."
      />
    );
  }

  const asset = assets[node.id];
  const finding = findings[node.id];
  const labelOf = (id: string) => graph.nodes.find((n) => n.id === id)?.label ?? id;
  const related = graph.edges.filter((e) => e.source === node.id || e.target === node.id);

  return (
    <div className="space-y-4 p-4" data-testid="node-inspector">
      <div>
        <p className="text-2xs uppercase text-fg-muted">{NODE_KIND_LABEL[node.type]}</p>
        <h3 className="mt-0.5 text-base font-semibold leading-snug text-fg">{node.label}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {node.severity && <SeverityBadge severity={node.severity} />}
          {finding && <ProvenanceBadge provenance={finding.provenance} />}
        </div>
      </div>

      <dl className="divide-y divide-line border-y border-line">
        <Row label="Node ID">
          <code className="font-mono text-2xs text-fg-soft">{node.id}</code>
        </Row>
        {asset && (
          <>
            <Row label="Type">{ASSET_TYPE_LABEL[asset.type]}</Row>
            <Row label="Environment">{titleCase(asset.environment)}</Row>
            <Row label="Criticality">{titleCase(asset.criticality)}</Row>
            <Row label="Owner">{asset.owner}</Row>
          </>
        )}
        {finding && (
          <>
            <Row label="Scanner label">{finding.scanner}</Row>
            {finding.location?.file && (
              <Row label="Location">
                <code className="font-mono text-2xs">
                  {finding.location.file}
                  {finding.location.line != null && `:${finding.location.line}`}
                </code>
              </Row>
            )}
            <Row label="Status">{titleCase(finding.status)}</Row>
          </>
        )}
      </dl>

      {finding && <p className="text-xs leading-relaxed text-fg-soft">{finding.description}</p>}

      <div>
        <h4 className="mb-2 text-2xs uppercase text-fg-muted">Relationships ({related.length})</h4>
        {related.length === 0 ? (
          <p className="text-xs text-fg-muted">No relationships reported for this node.</p>
        ) : (
          <ul className="space-y-2">
            {related.map((edge) => {
              const outgoing = edge.source === node.id;
              return (
                <li key={edge.id} className="rounded-md border border-line bg-ink-900 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-fg">{humanizeRelationship(edge.relationship)}</span>
                    <Badge tone={edge.inferred ? 'signal' : 'neutral'}>{edge.inferred ? 'Inferred' : 'Verified'}</Badge>
                  </div>
                  <p className="mt-1 text-fg-muted">
                    {outgoing ? 'to ' : 'from '}
                    <span className="text-fg-soft">{labelOf(outgoing ? edge.target : edge.source)}</span>
                    {edge.inferred && edge.confidence != null && ` · confidence ${formatPercent(edge.confidence)}`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {finding && (
        <Link
          to={`/threats?f=${encodeURIComponent(finding.id)}`}
          className="inline-block text-xs font-medium text-signal underline underline-offset-2"
        >
          Open in Threats &amp; Findings
        </Link>
      )}
    </div>
  );
}

const NODE_KIND_LABEL: Record<GraphNode['type'], string> = {
  ASSET: 'Asset',
  FINDING: 'Finding',
  IDENTITY: 'Identity',
  EXPLOIT_TARGET: 'Target asset',
};

interface EdgeInspectorProps {
  edge: GraphEdge | null;
  graph: SecurityGraph;
  /** True when this relationship is on the highlighted potential attack path. */
  onPath: boolean;
  onSelectNode: (id: string) => void;
}

/** Selected-relationship panel: type, verified vs inferred, confidence (only when supplied) and both endpoints. */
export function EdgeInspector({ edge, graph, onPath, onSelectNode }: EdgeInspectorProps) {
  if (!edge) return null;
  const find = (id: string) => graph.nodes.find((n) => n.id === id);
  const source = find(edge.source);
  const target = find(edge.target);

  return (
    <div className="space-y-4 p-4" data-testid="edge-inspector">
      <div>
        <p className="text-2xs uppercase text-fg-muted">Relationship</p>
        <h3 className="mt-0.5 text-base font-semibold leading-snug text-fg">{humanizeRelationship(edge.relationship)}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone={edge.inferred ? 'signal' : 'neutral'}>{edge.inferred ? 'Inferred' : 'Verified'}</Badge>
          {onPath && <Badge tone="critical">On potential path</Badge>}
        </div>
      </div>

      <dl className="divide-y divide-line border-y border-line">
        <Row label="Edge ID">
          <code className="font-mono text-2xs text-fg-soft">{edge.id}</code>
        </Row>
        <Row label="From">
          <button type="button" onClick={() => onSelectNode(edge.source)} className="text-signal underline underline-offset-2">
            {source?.label ?? edge.source}
          </button>
        </Row>
        <Row label="To">
          <button type="button" onClick={() => onSelectNode(edge.target)} className="text-signal underline underline-offset-2">
            {target?.label ?? edge.target}
          </button>
        </Row>
        {edge.confidence != null && <Row label="Confidence">{formatPercent(edge.confidence)}</Row>}
      </dl>

      <p className="text-xs leading-relaxed text-fg-soft">
        {edge.inferred
          ? 'Inferred by correlation. It is not a directly observed fact' +
            (edge.confidence != null ? ', and the confidence is an engine estimate, not proof.' : '.')
          : 'A recorded relationship reported by the data source.'}
        {onPath && ' It is one hop of a potential attack path, which is not a confirmed exploit.'}
      </p>
    </div>
  );
}
