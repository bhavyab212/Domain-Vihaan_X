import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertOctagon, FlaskConical, Target, UserCog } from 'lucide-react';
import { AssetIcon } from '@/components/common/AssetIcon';
import { SEVERITY_STYLE } from '@/lib/utils/severity';
import { cn } from '@/lib/utils/cn';
import { formatPercent, humanizeRelationship } from '@/lib/utils/format';
import type { AssetType, DataOrigin, GraphNode, SecurityGraph } from '@/types';
import { edgeGeometry, layoutGraph, NODE_H, NODE_W } from './layout';

/**
 * GraphCanvas: the replaceable rendering boundary for the Business Security Graph.
 *
 * ADR-006 (React Flow) is still PROPOSED, so this first preview is plain SVG + HTML. A future
 * React Flow implementation only has to honour this props contract; GraphView does not change.
 */
export interface GraphCanvasProps {
  graph: SecurityGraph;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Node ids and edge ids on the highlighted potential attack path (empty = no highlight). */
  highlight: { nodes: ReadonlySet<string>; edges: ReadonlySet<string> };
  origin: DataOrigin;
}

function nodeAssetType(node: GraphNode): AssetType | undefined {
  const value = node.data?.assetType;
  return typeof value === 'string' ? (value as AssetType) : undefined;
}

const KIND_LABEL: Record<GraphNode['type'], string> = {
  ASSET: 'Asset',
  FINDING: 'Finding',
  IDENTITY: 'Identity',
  EXPLOIT_TARGET: 'Target asset',
};

/** Short on-canvas kind label so it never truncates at the compact node width. */
const KIND_SHORT: Record<GraphNode['type'], string> = {
  ASSET: 'Asset',
  FINDING: 'Finding',
  IDENTITY: 'Identity',
  EXPLOIT_TARGET: 'Target',
};

function NodeGlyph({ node }: { node: GraphNode }) {
  if (node.type === 'FINDING') return <AlertOctagon className="h-4 w-4" aria-hidden />;
  if (node.type === 'IDENTITY') return <UserCog className="h-4 w-4" aria-hidden />;
  if (node.type === 'EXPLOIT_TARGET') return <Target className="h-4 w-4" aria-hidden />;
  return <AssetIcon type={nodeAssetType(node)} className="h-4 w-4" />;
}

/** Scale factor so the whole graph fits the container width (never enlarges past 1:1). */
function useFitScale(contentWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      const available = el.clientWidth;
      if (available > 0) setScale(Math.min(1, available / contentWidth));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [contentWidth]);
  return { ref, scale };
}

export function GraphCanvas({ graph, selectedId, onSelect, highlight, origin }: GraphCanvasProps) {
  const layout = useMemo(() => layoutGraph(graph), [graph]);
  const { ref, scale } = useFitScale(layout.width);
  const edges = useMemo(
    () => graph.edges.map((edge) => edgeGeometry(edge, layout)).filter((g): g is NonNullable<typeof g> => g !== null),
    [graph.edges, layout],
  );
  const simulated = origin === 'SIMULATED_DEMO';
  const anyHighlight = highlight.nodes.size > 0;

  return (
    <div
      ref={ref}
      className="bg-grid overflow-hidden rounded-md border border-line bg-ink-950"
      data-testid="graph-canvas"
      data-scale={scale.toFixed(2)}
      style={{ height: layout.height * scale }}
      onClick={() => onSelect(null)}
    >
      <div
        className="relative origin-top-left"
        style={{ width: layout.width, height: layout.height, transform: `scale(${scale})` }}
      >
        <svg width={layout.width} height={layout.height} className="absolute inset-0" role="presentation">
          <defs>
            <marker id="arrow-verified" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#5B85FF" />
            </marker>
            <marker id="arrow-inferred" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38BDF8" />
            </marker>
            <marker id="arrow-path" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#F0455A" />
            </marker>
          </defs>

          {edges.map(({ edge, path, mx, my }) => {
            const onPath = highlight.edges.has(edge.id);
            const dim = anyHighlight && !onPath;
            const stroke = onPath ? '#F0455A' : edge.inferred ? '#38BDF8' : '#5B85FF';
            const marker = onPath ? 'arrow-path' : edge.inferred ? 'arrow-inferred' : 'arrow-verified';
            const label = humanizeRelationship(edge.relationship);
            const sublabel = edge.inferred
              ? `inferred${edge.confidence != null ? ` · ${formatPercent(edge.confidence)}` : ''}`
              : 'verified';
            return (
              <g key={edge.id} opacity={dim ? 0.28 : 1} data-edge-id={edge.id} data-inferred={edge.inferred}>
                <path
                  d={path}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={onPath ? 2.5 : 1.75}
                  strokeDasharray={edge.inferred ? '7 5' : undefined}
                  markerEnd={`url(#${marker})`}
                  className={cn(edge.inferred && 'edge-flow')}
                />
                <text
                  x={mx}
                  y={my - 16}
                  textAnchor="middle"
                  fontSize="11"
                  fill={onPath ? '#F59AA6' : '#BAC6DB'}
                  stroke="#05080F"
                  strokeWidth="4"
                  paintOrder="stroke"
                  className="select-none font-sans"
                >
                  <tspan x={mx}>{label}</tspan>
                  <tspan x={mx} dy="13" fontSize="10" fill={edge.inferred ? '#38BDF8' : '#8FA9FF'}>
                    {sublabel}
                  </tspan>
                </text>
              </g>
            );
          })}
        </svg>

        {layout.nodes.map(({ node, x, y }) => {
          const selected = selectedId === node.id;
          const onPath = highlight.nodes.has(node.id);
          const dim = anyHighlight && !onPath;
          const isFinding = node.type === 'FINDING';
          const sev = node.severity ? SEVERITY_STYLE[node.severity] : null;
          return (
            <button
              key={node.id}
              type="button"
              data-node-id={node.id}
              data-node-type={node.type}
              aria-pressed={selected}
              aria-label={`${KIND_LABEL[node.type]}: ${node.label}${sev ? `, ${sev.label} severity` : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(selected ? null : node.id);
              }}
              style={{ left: x, top: y, width: NODE_W, height: NODE_H }}
              className={cn(
                'absolute flex flex-col justify-between overflow-hidden rounded-md border px-3 py-2.5 text-left transition-all',
                isFinding ? 'border-dashed bg-ink-900' : 'bg-ink-850',
                selected ? 'border-signal ring-2 ring-signal/40' : isFinding ? 'border-sev-critical/35 hover:border-sev-critical/70' : 'border-line-strong hover:border-signal/60',
                dim && 'opacity-40',
              )}
            >
              {sev && <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', sev.bar)} />}
              <span className="flex items-center gap-1.5 pl-1 text-2xs uppercase text-fg-muted">
                <span className={cn('shrink-0', isFinding ? 'text-sev-critical' : 'text-signal')}>
                  <NodeGlyph node={node} />
                </span>
                <span className="whitespace-nowrap">{KIND_SHORT[node.type]}</span>
                {simulated && (
                  <span title="Simulated demo data" className="shrink-0 text-sim">
                    <FlaskConical className="h-3 w-3" aria-hidden />
                    <span className="sr-only">Simulated</span>
                  </span>
                )}
                {sev && <span className={cn('ml-auto shrink-0 font-semibold', sev.text)}>{sev.label}</span>}
              </span>
              <span className="line-clamp-2 pl-1 text-[13px] font-medium leading-snug text-fg">{node.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Legend that explains every visual encoding used on the canvas. */
export function GraphLegend({ origin }: { origin: DataOrigin }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-muted" aria-label="Graph legend">
      <li className="flex items-center gap-2">
        <span aria-hidden className="h-3.5 w-5 rounded-sm border border-line-strong bg-ink-850" />
        Asset
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden className="h-3.5 w-5 rounded-sm border border-dashed border-sev-critical/60 bg-ink-900" />
        Finding
      </li>
      <li className="flex items-center gap-2">
        <svg width="26" height="8" aria-hidden>
          <line x1="0" y1="4" x2="26" y2="4" stroke="#5B85FF" strokeWidth="2" />
        </svg>
        Verified relationship
      </li>
      <li className="flex items-center gap-2">
        <svg width="26" height="8" aria-hidden>
          <line x1="0" y1="4" x2="26" y2="4" stroke="#38BDF8" strokeWidth="2" strokeDasharray="5 3" />
        </svg>
        Inferred relationship
      </li>
      <li className="flex items-center gap-2">
        <svg width="26" height="8" aria-hidden>
          <line x1="0" y1="4" x2="26" y2="4" stroke="#F0455A" strokeWidth="2.5" strokeDasharray="5 3" />
        </svg>
        Potential attack path
      </li>
      {origin === 'SIMULATED_DEMO' && (
        <li className="flex items-center gap-1.5 text-sim">
          <FlaskConical className="h-3.5 w-3.5" aria-hidden />
          Simulated demo data
        </li>
      )}
    </ul>
  );
}
