/**
 * Data preparation for the React Flow canvas. PURE functions only (no React, no DOM), so the node/edge
 * model is unit-testable without rendering.
 *
 * Responsibilities: turn the backend `SecurityGraph` (+ assets/findings for display metadata) into React
 * Flow nodes/edges, and derive per-render view state (selection, highlighted path, dimming).
 *
 * Non-responsibilities (stay on the backend): risk scoring, correlation, path discovery. The highlighted
 * path is built only from ids the backend supplied in `AttackPath.steps`.
 */

import { MarkerType, Position, type Edge, type Node } from '@xyflow/react';
import { ASSET_TYPE_LABEL, formatPercent, humanizeRelationship } from '@/lib/utils/format';
import type {
  AssetType,
  AttackPath,
  Criticality,
  DataOrigin,
  DigitalAsset,
  Environment,
  GraphEdge,
  GraphNode,
  GraphNodeType,
  GraphRelationship,
  ProvenanceType,
  SecurityFinding,
  SecurityGraph,
  SeverityLevel,
} from '@/types';
import { layoutGraph, NODE_H, NODE_W } from './layout';

/* ------------------------------------------------------------------ node + edge types */

export type AssetFlowData = {
  kind: 'asset';
  label: string;
  graphType: GraphNodeType;
  /** Human label for the card header, e.g. "Repository" / "Cloud account" / "Target". */
  typeLabel: string;
  assetType?: AssetType;
  environment?: Environment;
  criticality?: Criticality;
  /** Business owner exactly as supplied by the asset record. */
  owner?: string;
  /** One metadata value taken verbatim from the asset (branch, provider or ARN); never invented. */
  metaLine?: string;
  severity?: SeverityLevel;
  /** True only for local preview fixtures. Assets carry no provenance field in the API contract. */
  simulated: boolean;
  onPath: boolean;
  dim: boolean;
  [key: string]: unknown;
};

/**
 * Identity card data. An IdentityNode exists ONLY when the graph payload itself says `type: "IDENTITY"`; nothing
 * is promoted to an identity to make the graph look richer. When the node is backed by an asset record whose real
 * name differs from the node label, that real asset is shown so the label can never stand in for it.
 */
export type IdentityFlowData = {
  kind: 'identity';
  label: string;
  /** Real asset record behind this node, when the inventory has one. */
  backingAsset?: { name: string; typeLabel: string };
  environment?: Environment;
  criticality?: Criticality;
  owner?: string;
  severity?: SeverityLevel;
  simulated: boolean;
  onPath: boolean;
  dim: boolean;
  [key: string]: unknown;
};

export type FindingFlowData = {
  kind: 'finding';
  label: string;
  severity?: SeverityLevel;
  scanner?: string;
  assetName?: string;
  provenance?: ProvenanceType;
  onPath: boolean;
  dim: boolean;
  [key: string]: unknown;
};

export type AssetFlowNode = Node<AssetFlowData, 'asset'>;
export type IdentityFlowNode = Node<IdentityFlowData, 'identity'>;
export type FindingFlowNode = Node<FindingFlowData, 'finding'>;
export type GraphFlowNode = AssetFlowNode | IdentityFlowNode | FindingFlowNode;

export type RelationshipEdgeData = {
  relationship: GraphRelationship;
  inferred: boolean;
  confidence?: number;
  /** On the highlighted potential attack path. */
  onPath: boolean;
  /** Touches the selected node. */
  connected: boolean;
  /** This relationship itself is the selected item. */
  selected: boolean;
  dim: boolean;
  /** Flow animation: only ever true for on-path edges, and never under reduced motion. */
  animated: boolean;
  label: string;
  sublabel: string;
  [key: string]: unknown;
};

export type RelationshipFlowEdge = Edge<RelationshipEdgeData, 'relationship'>;

export const NODE_TYPE_ASSET = 'asset';
export const NODE_TYPE_IDENTITY = 'identity';
export const NODE_TYPE_FINDING = 'finding';
export const EDGE_TYPE_RELATIONSHIP = 'relationship';

/** Visual language, as hex for SVG strokes and markers. */
export const EDGE_COLOR = {
  verified: '#5B85FF',
  inferred: '#38BDF8',
  path: '#F0455A',
} as const;

/* ------------------------------------------------------------------ view state */

export interface Highlight {
  nodes: ReadonlySet<string>;
  edges: ReadonlySet<string>;
}

export const NO_HIGHLIGHT: Highlight = { nodes: new Set<string>(), edges: new Set<string>() };

export interface GraphView {
  selectedId: string | null;
  /** A selected relationship (mutually exclusive with a selected node at the view level). */
  selectedEdgeId?: string | null;
  highlight: Highlight;
  reducedMotion: boolean;
}

/**
 * Which nodes/edges belong to a potential attack path, using only ids the backend supplied.
 * Edges are the hops between consecutive path assets; finding attachments are not highlighted.
 */
export function pathHighlight(graph: SecurityGraph, path: AttackPath | undefined): Highlight {
  if (!path) return NO_HIGHLIGHT;
  const nodes = new Set<string>();
  const assetIds = new Set<string>();
  for (const step of path.steps) {
    nodes.add(step.assetId);
    assetIds.add(step.assetId);
    if (step.findingId) nodes.add(step.findingId);
  }
  const edges = new Set<string>();
  for (const edge of graph.edges) {
    if (assetIds.has(edge.source) && assetIds.has(edge.target)) edges.add(edge.id);
  }
  return { nodes, edges };
}

/* ------------------------------------------------------------------ nodes */

type HandleList = NonNullable<Node['handles']>;

/** Declared up-front so edges can render before the browser has measured the DOM (and in tests). */
function sideHandles(): HandleList {
  const size = 1;
  const sides: { id: string; position: Position; x: number; y: number }[] = [
    { id: 'l', position: Position.Left, x: 0, y: NODE_H / 2 },
    { id: 'r', position: Position.Right, x: NODE_W, y: NODE_H / 2 },
    { id: 't', position: Position.Top, x: NODE_W / 2, y: 0 },
    { id: 'b', position: Position.Bottom, x: NODE_W / 2, y: NODE_H },
  ];
  return sides.flatMap((s) => [
    { ...s, type: 'source' as const, width: size, height: size },
    { ...s, type: 'target' as const, width: size, height: size },
  ]);
}

const HANDLES = sideHandles();

const METADATA_KEYS = ['branch', 'provider', 'arn'] as const;

/** First recognised metadata value, exactly as supplied. Secrets are never in asset metadata. */
function metadataLine(asset: DigitalAsset | undefined): string | undefined {
  const meta = asset?.metadata;
  if (!meta) return undefined;
  for (const key of METADATA_KEYS) {
    const value = meta[key];
    if (typeof value === 'string' && value.length > 0) return key === 'branch' ? `branch ${value}` : value;
  }
  return undefined;
}

function nodeAssetType(node: GraphNode, asset: DigitalAsset | undefined): AssetType | undefined {
  if (asset) return asset.type;
  const value = node.data?.assetType;
  return typeof value === 'string' ? (value as AssetType) : undefined;
}

function typeLabelFor(node: GraphNode, assetType: AssetType | undefined): string {
  if (node.type === 'IDENTITY') return 'Identity';
  if (node.type === 'EXPLOIT_TARGET') return 'Target';
  return assetType ? ASSET_TYPE_LABEL[assetType] : 'Asset';
}

/**
 * Structural nodes: positions, sizes, display metadata. Selection/highlight are layered on later by
 * `styleNodes`, so dragging (positions) is never lost when only the view state changes.
 */
export function buildFlowNodes(
  graph: SecurityGraph,
  assets: DigitalAsset[],
  findings: SecurityFinding[],
  origin: DataOrigin,
): GraphFlowNode[] {
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const findingById = new Map(findings.map((f) => [f.id, f]));
  const layout = layoutGraph(graph);
  const simulated = origin === 'SIMULATED_DEMO';

  return layout.nodes.map(({ node, x, y }): GraphFlowNode => {
    const common = {
      id: node.id,
      position: { x, y },
      width: NODE_W,
      height: NODE_H,
      handles: HANDLES,
      ariaRole: 'button' as const,
    };

    if (node.type === 'FINDING') {
      const finding = findingById.get(node.id);
      const asset = finding ? assetById.get(finding.assetId) : undefined;
      const severity = finding?.severity ?? node.severity;
      const scanner = finding?.scanner ?? (typeof node.data?.scanner === 'string' ? node.data.scanner : undefined);
      return {
        ...common,
        type: NODE_TYPE_FINDING,
        ariaLabel: `Finding: ${node.label}${severity ? `, ${severity.toLowerCase()} severity` : ''}`,
        data: {
          kind: 'finding',
          label: node.label,
          severity,
          scanner,
          assetName: asset?.name,
          provenance: finding?.provenance,
          onPath: false,
          dim: false,
        },
      };
    }

    const asset = assetById.get(node.id);
    const assetType = nodeAssetType(node, asset);

    if (node.type === 'IDENTITY') {
      const differs = asset !== undefined && asset.name !== node.label;
      return {
        ...common,
        type: NODE_TYPE_IDENTITY,
        ariaLabel: `Identity: ${node.label}${node.severity ? `, ${node.severity.toLowerCase()} severity` : ''}`,
        data: {
          kind: 'identity',
          label: node.label,
          backingAsset: differs && asset && assetType ? { name: asset.name, typeLabel: ASSET_TYPE_LABEL[assetType] } : undefined,
          environment: asset?.environment,
          criticality: asset?.criticality,
          owner: asset?.owner,
          severity: node.severity,
          simulated,
          onPath: false,
          dim: false,
        },
      };
    }

    return {
      ...common,
      type: NODE_TYPE_ASSET,
      ariaLabel: `${typeLabelFor(node, assetType)}: ${node.label}${
        node.severity ? `, ${node.severity.toLowerCase()} severity` : ''
      }`,
      data: {
        kind: 'asset',
        label: node.label,
        graphType: node.type,
        typeLabel: typeLabelFor(node, assetType),
        assetType,
        environment: asset?.environment,
        criticality: asset?.criticality,
        owner: asset?.owner,
        metaLine: metadataLine(asset),
        severity: node.severity,
        simulated,
        onPath: false,
        dim: false,
      },
    };
  });
}

/** Layer selection + path highlight over structural nodes. Only changed nodes get new objects. */
export function styleNodes(nodes: GraphFlowNode[], view: GraphView): GraphFlowNode[] {
  const pathActive = view.highlight.nodes.size > 0;
  return nodes.map((node) => {
    const onPath = view.highlight.nodes.has(node.id);
    const dim = pathActive && !onPath;
    const selected = node.id === view.selectedId;
    if (node.data.onPath === onPath && node.data.dim === dim && Boolean(node.selected) === selected) return node;
    return { ...node, selected, data: { ...node.data, onPath, dim } } as GraphFlowNode;
  });
}

/* ------------------------------------------------------------------ edges */

/** Pick which sides an edge leaves/enters so it never cuts through its own nodes. */
export function edgeHandles(
  source: { x: number; y: number } | undefined,
  target: { x: number; y: number } | undefined,
): { sourceHandle: string; targetHandle: string } {
  if (!source || !target) return { sourceHandle: 'r', targetHandle: 'l' };
  const dx = target.x - source.x;
  if (Math.abs(dx) < NODE_W / 2) {
    return target.y >= source.y ? { sourceHandle: 'b', targetHandle: 't' } : { sourceHandle: 't', targetHandle: 'b' };
  }
  return dx > 0 ? { sourceHandle: 'r', targetHandle: 'l' } : { sourceHandle: 'l', targetHandle: 'r' };
}

function edgeColor(edge: GraphEdge, onPath: boolean): string {
  if (onPath) return EDGE_COLOR.path;
  return edge.inferred ? EDGE_COLOR.inferred : EDGE_COLOR.verified;
}

function edgeSublabel(edge: GraphEdge): string {
  if (!edge.inferred) return 'verified';
  return edge.confidence != null ? `inferred · ${formatPercent(edge.confidence)}` : 'inferred';
}

export function buildFlowEdges(
  graph: SecurityGraph,
  structuralNodes: GraphFlowNode[],
  view: GraphView,
): RelationshipFlowEdge[] {
  const positions = new Map(structuralNodes.map((n) => [n.id, n.position]));
  const labels = new Map(graph.nodes.map((n) => [n.id, n.label]));
  const pathActive = view.highlight.edges.size > 0;

  return graph.edges
    .filter((edge) => positions.has(edge.source) && positions.has(edge.target))
    .map((edge): RelationshipFlowEdge => {
      const onPath = view.highlight.edges.has(edge.id);
      const selected = view.selectedEdgeId === edge.id;
      const connected = view.selectedId != null && (edge.source === view.selectedId || edge.target === view.selectedId);
      const anySelection = view.selectedId != null || view.selectedEdgeId != null;
      // A path highlight wins; otherwise a selection dims everything that is not part of it.
      const dim = pathActive ? !onPath && !selected : anySelection && !connected && !selected;
      const color = edgeColor(edge, onPath);
      const sublabel = edgeSublabel(edge);
      const { sourceHandle, targetHandle } = edgeHandles(positions.get(edge.source), positions.get(edge.target));
      return {
        id: edge.id,
        type: EDGE_TYPE_RELATIONSHIP,
        source: edge.source,
        target: edge.target,
        sourceHandle,
        targetHandle,
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
        // Clicking a relationship selects it, so its type, confidence and endpoints can be inspected. Whether
        // that does anything is up to the canvas (it only wires edge clicks when given `onSelectEdge`).
        selectable: true,
        selected,
        ariaLabel: `${humanizeRelationship(edge.relationship)}, ${sublabel}, from ${labels.get(edge.source) ?? edge.source} to ${
          labels.get(edge.target) ?? edge.target
        }`,
        data: {
          relationship: edge.relationship,
          inferred: edge.inferred,
          confidence: edge.confidence,
          onPath,
          connected,
          selected,
          dim,
          // Only the active potential path animates, and never under prefers-reduced-motion.
          animated: onPath && !view.reducedMotion,
          label: humanizeRelationship(edge.relationship),
          sublabel,
        },
      };
    });
}

/** Plain-language summary for assistive technology and tests. */
export function describeGraph(graph: SecurityGraph): string {
  const inferred = graph.edges.filter((e) => e.inferred).length;
  return `${graph.nodes.length} nodes and ${graph.edges.length} relationships, ${inferred} inferred and ${
    graph.edges.length - inferred
  } verified.`;
}
