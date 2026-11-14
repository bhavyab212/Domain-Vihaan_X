import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeChange,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FlaskConical } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SEVERITY_STYLE } from '@/lib/utils/severity';
import type { DataOrigin, DigitalAsset, SecurityFinding, SecurityGraph } from '@/types';
import { AttackEdge } from './edges/AttackEdge';
import {
  buildFlowEdges,
  buildFlowNodes,
  describeGraph,
  EDGE_COLOR,
  EDGE_TYPE_RELATIONSHIP,
  NODE_TYPE_ASSET,
  NODE_TYPE_FINDING,
  styleNodes,
  type GraphFlowNode,
  type Highlight,
} from './model';
import { AssetNode } from './nodes/AssetNode';
import { FindingNode } from './nodes/FindingNode';

/**
 * GraphCanvas: the rendering boundary for the Business Security Graph, implemented with React Flow
 * (ADR-006). `SecurityGraphView` and `NodeInspector` depend only on this props contract.
 *
 * Capabilities: drag nodes, wheel/pinch zoom, pan, fit view, minimap, keyboard-focusable selectable nodes.
 * Node dragging is cosmetic (positions only). Nothing here computes risk, paths or correlations.
 */
export interface GraphCanvasProps {
  graph: SecurityGraph;
  /** Display metadata for node cards. Missing entries degrade gracefully (the card shows less). */
  assets: DigitalAsset[];
  findings: SecurityFinding[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Node ids and edge ids on the highlighted potential attack path (empty = no highlight). */
  highlight: Highlight;
  origin: DataOrigin;
}

/** Stable references: React Flow warns (and re-mounts every node) if these are recreated per render. */
const NODE_TYPES: NodeTypes = { [NODE_TYPE_ASSET]: AssetNode, [NODE_TYPE_FINDING]: FindingNode };
const EDGE_TYPES: EdgeTypes = { [EDGE_TYPE_RELATIONSHIP]: AttackEdge };

const FIT_OPTIONS = { padding: 0.12, maxZoom: 1.1, duration: 350 } as const;
/** Compact: the default 200x150 minimap covers a large share of a laptop-size canvas. */
const MINIMAP_STYLE = { width: 120, height: 80 } as const;

/** Stable identity for the input graph: rebuild structure (and reset drag positions) only when it changes. */
function graphSignature(graph: SecurityGraph): string {
  return `${graph.updatedAt}|${graph.nodes.map((n) => n.id).join(',')}|${graph.edges.map((e) => e.id).join(',')}`;
}

function minimapColor(node: GraphFlowNode): string {
  const severity = node.data.severity;
  return severity ? SEVERITY_STYLE[severity].hex : '#2A3C5E';
}

function CanvasInner({ graph, assets, findings, selectedId, onSelect, highlight, origin }: GraphCanvasProps) {
  const reducedMotion = useReducedMotion();
  const { fitView } = useReactFlow();

  // Structure (ids, positions, display metadata) -- rebuilt only when the graph or its metadata change.
  const structural = useMemo(
    () => buildFlowNodes(graph, assets, findings, origin),
    [graph, assets, findings, origin],
  );

  // Dragged positions live here so selection / highlight changes never snap nodes back.
  const [dragged, setDragged] = useState<Record<string, { x: number; y: number }>>({});
  const signature = graphSignature(graph);
  useEffect(() => setDragged({}), [signature]);

  const positioned = useMemo(
    () => structural.map((n) => (dragged[n.id] ? { ...n, position: dragged[n.id] } : n)),
    [structural, dragged],
  );

  const view = useMemo(() => ({ selectedId, highlight, reducedMotion }), [selectedId, highlight, reducedMotion]);
  const nodes = useMemo(() => styleNodes(positioned, view), [positioned, view]);
  // Edges are routed from the initial layout so a drag does not flip which side an edge leaves from.
  const edges = useMemo(() => buildFlowEdges(graph, structural, view), [graph, structural, view]);

  // Latest selection, readable inside the stable change handler without re-creating it.
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  const onNodesChange = useCallback(
    (changes: NodeChange<GraphFlowNode>[]) => {
      const moves = changes.filter((c) => c.type === 'position' && c.position);
      if (moves.length > 0) {
        setDragged((prev) => {
          const next = { ...prev };
          for (const change of moves) if (change.type === 'position' && change.position) next[change.id] = change.position;
          return next;
        });
      }

      // Selection is owned by the parent. React Flow reports pointer AND keyboard (Enter/Space/Escape)
      // selection here; mouse clicks additionally arrive via onNodeClick. Mirroring it keeps keyboard
      // users able to select nodes (onNodeClick alone would never fire for them).
      const selects = changes.filter((c) => c.type === 'select');
      const picked = selects.filter((c) => c.type === 'select' && c.selected).map((c) => c.id);
      if (picked.length > 0) {
        onSelect(picked[picked.length - 1]);
      } else if (selects.some((c) => c.id === selectedRef.current)) {
        onSelect(null); // Escape (or RF deselecting the current node) with nothing newly selected
      }
    },
    [onSelect],
  );

  // Focus the graph on the highlighted path (but keep the whole graph in context via padding).
  const highlightKey = useMemo(() => [...highlight.nodes].sort().join('|'), [highlight.nodes]);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const ids = [...highlight.nodes];
    const duration = reducedMotion ? 0 : FIT_OPTIONS.duration;
    void fitView(
      ids.length > 0
        ? { nodes: ids.map((id) => ({ id })), padding: 0.45, maxZoom: 1, duration }
        : { padding: FIT_OPTIONS.padding, maxZoom: FIT_OPTIONS.maxZoom, duration },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightKey]);

  const summary = useMemo(() => describeGraph(graph), [graph]);

  return (
    <div
      data-testid="graph-canvas"
      data-node-count={graph.nodes.length}
      data-edge-count={graph.edges.length}
      className="h-[440px] w-full overflow-hidden rounded-md border border-line bg-ink-950 md:h-[460px]"
      role="group"
      aria-label={`Business Security Graph. ${summary} Select a node for details.`}
    >
      <ReactFlow<GraphFlowNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onNodeClick={(_, node) => onSelect(node.id === selectedId ? null : node.id)}
        onPaneClick={() => onSelect(null)}
        fitView
        fitViewOptions={FIT_OPTIONS}
        minZoom={0.25}
        maxZoom={2}
        nodesDraggable
        nodesConnectable={false}
        edgesFocusable={false}
        elementsSelectable
        nodesFocusable
        zoomOnDoubleClick={false}
        // React Flow asks non-Pro users to keep its attribution (MIT licence, no Pro subscription here), so it
        // is shown, tucked bottom-centre where it does not collide with the controls or the minimap.
        attributionPosition="bottom-center"
        colorMode="dark"
        defaultEdgeOptions={{ zIndex: 0 }}
        aria-label="Security graph canvas"
      >
        <Background variant={BackgroundVariant.Lines} gap={32} color="rgba(56,189,248,0.07)" lineWidth={1} />
        <Controls
          position="bottom-left"
          showInteractive={false}
          fitViewOptions={FIT_OPTIONS}
          aria-label="Graph view controls"
        />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          style={MINIMAP_STYLE}
          nodeColor={minimapColor}
          nodeStrokeWidth={0}
          maskColor="rgba(5,8,15,0.72)"
          ariaLabel="Graph minimap"
          className="!hidden sm:!block"
        />
      </ReactFlow>
    </div>
  );
}

/** React Flow needs its provider so `useReactFlow` (fit view on path focus) works inside the canvas. */
export function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
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
          <line x1="0" y1="4" x2="26" y2="4" stroke={EDGE_COLOR.verified} strokeWidth="2" />
        </svg>
        Verified relationship
      </li>
      <li className="flex items-center gap-2">
        <svg width="26" height="8" aria-hidden>
          <line x1="0" y1="4" x2="26" y2="4" stroke={EDGE_COLOR.inferred} strokeWidth="2" strokeDasharray="5 3" />
        </svg>
        Inferred relationship
      </li>
      <li className="flex items-center gap-2">
        <svg width="26" height="8" aria-hidden>
          <line x1="0" y1="4" x2="26" y2="4" stroke={EDGE_COLOR.path} strokeWidth="2.5" strokeDasharray="5 3" />
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
