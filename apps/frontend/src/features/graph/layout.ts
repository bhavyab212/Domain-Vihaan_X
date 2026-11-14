import type { GraphEdge, GraphNode, SecurityGraph } from '@/types';

/**
 * Deterministic layered layout for the graph preview.
 *
 * The API contract returns nodes and edges without coordinates, so the presentation layer arranges
 * them: non-finding nodes flow left to right by dependency depth, and each finding sits directly
 * beneath the node that exposes it. This is layout only; no security logic.
 */

export const NODE_W = 188;
export const NODE_H = 78;
const COL_GAP = 112;
const FINDING_GAP = 76;
const ROW_GAP = 56;
const PAD = 36;
const MIN_HEIGHT = 340;

export interface PositionedNode {
  node: GraphNode;
  x: number;
  y: number;
}

export interface GraphLayout {
  nodes: PositionedNode[];
  byId: Record<string, PositionedNode>;
  width: number;
  height: number;
}

export function layoutGraph(graph: SecurityGraph): GraphLayout {
  const parentOf = new Map<string, string>();
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  // A finding hangs under the first non-finding node that points at it.
  for (const edge of graph.edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (source && target && target.type === 'FINDING' && source.type !== 'FINDING' && !parentOf.has(target.id)) {
      parentOf.set(target.id, source.id);
    }
  }

  const mains = graph.nodes.filter((n) => n.type !== 'FINDING' || !parentOf.has(n.id));
  const mainIds = new Set(mains.map((n) => n.id));

  // Column = longest dependency chain between main nodes (cycle-safe: bounded passes).
  const depth: Record<string, number> = Object.fromEntries(mains.map((n) => [n.id, 0]));
  const mainEdges = graph.edges.filter((e) => mainIds.has(e.source) && mainIds.has(e.target));
  for (let pass = 0; pass < mains.length; pass++) {
    let changed = false;
    for (const edge of mainEdges) {
      const next = Math.min(depth[edge.source] + 1, mains.length - 1);
      if (next > depth[edge.target]) {
        depth[edge.target] = next;
        changed = true;
      }
    }
    if (!changed) break;
  }

  const columns = new Map<number, GraphNode[]>();
  for (const node of mains) {
    const col = depth[node.id];
    columns.set(col, [...(columns.get(col) ?? []), node]);
  }

  const childrenOf = new Map<string, GraphNode[]>();
  for (const [childId, parentId] of parentOf) {
    const child = nodeById.get(childId);
    if (child) childrenOf.set(parentId, [...(childrenOf.get(parentId) ?? []), child]);
  }

  const positioned: PositionedNode[] = [];
  let maxCol = 0;
  let maxBottom = 0;

  for (const [col, nodes] of [...columns.entries()].sort((a, b) => a[0] - b[0])) {
    maxCol = Math.max(maxCol, col);
    const x = PAD + col * (NODE_W + COL_GAP);
    let cursor = PAD;
    for (const node of nodes) {
      positioned.push({ node, x, y: cursor });
      let bottom = cursor + NODE_H;
      for (const child of childrenOf.get(node.id) ?? []) {
        const y = bottom + FINDING_GAP;
        positioned.push({ node: child, x, y });
        bottom = y + NODE_H;
      }
      maxBottom = Math.max(maxBottom, bottom);
      cursor = bottom + ROW_GAP;
    }
  }

  const byId = Object.fromEntries(positioned.map((p) => [p.node.id, p]));
  return {
    nodes: positioned,
    byId,
    width: PAD * 2 + (maxCol + 1) * NODE_W + maxCol * COL_GAP,
    height: Math.max(MIN_HEIGHT, maxBottom + PAD),
  };
}

export interface EdgeGeometry {
  edge: GraphEdge;
  path: string;
  /** Label anchor (midpoint). */
  mx: number;
  my: number;
}

/** Cubic path between two positioned nodes, exiting/entering on the facing sides. */
export function edgeGeometry(edge: GraphEdge, layout: GraphLayout): EdgeGeometry | null {
  const a = layout.byId[edge.source];
  const b = layout.byId[edge.target];
  if (!a || !b) return null;

  const sameColumn = Math.abs(a.x - b.x) < NODE_W / 2;
  let x1: number, y1: number, x2: number, y2: number, path: string;

  if (sameColumn) {
    const down = b.y >= a.y;
    x1 = a.x + NODE_W / 2;
    x2 = b.x + NODE_W / 2;
    y1 = down ? a.y + NODE_H : a.y;
    y2 = down ? b.y : b.y + NODE_H;
    const bend = (y2 - y1) / 2;
    path = `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`;
  } else {
    const right = b.x >= a.x;
    x1 = right ? a.x + NODE_W : a.x;
    x2 = right ? b.x : b.x + NODE_W;
    y1 = a.y + NODE_H / 2;
    y2 = b.y + NODE_H / 2;
    const bend = Math.max(40, Math.abs(x2 - x1) / 2);
    const dir = right ? 1 : -1;
    path = `M ${x1} ${y1} C ${x1 + dir * bend} ${y1}, ${x2 - dir * bend} ${y2}, ${x2} ${y2}`;
  }

  return { edge, path, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
}
