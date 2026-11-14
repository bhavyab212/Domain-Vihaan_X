import type { GraphNode, SecurityGraph } from '@/types';

/**
 * Deterministic layered layout (positions only; no security logic).
 *
 * The API contract returns nodes and edges without coordinates, so the presentation layer arranges them:
 * non-finding nodes flow left to right by dependency depth, and each finding hangs directly beneath the
 * node that exposes it. The same input always yields the same output (no randomness, no physics), so the
 * initial view is stable across reloads and in tests. Users can then drag nodes freely.
 */

// Sized so a finding card (header, 2-line title, badge row, asset line) fits without clipping.
export const NODE_W = 224;
export const NODE_H = 148;
const COL_GAP = 104;
const FINDING_GAP = 64;
const ROW_GAP = 44;
const PAD = 28;
const MIN_HEIGHT = 300;

export interface PositionedNode {
  node: GraphNode;
  /** Top-left corner, in flow coordinates. */
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
