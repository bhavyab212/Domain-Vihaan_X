/**
 * Pure model for the attack-path investigation. No React, no network, no scoring.
 *
 * Everything here is RESOLUTION of ids the backend already supplied (AttackPath.steps, graph nodes/edges, findings,
 * assets, remediations) into display facts. Nothing is discovered, ranked or inferred. When a fact is not supplied it
 * is left undefined so the UI can say "not provided" instead of guessing.
 */

import { assetFacts, findingNodeFacts } from '@/features/graph/model';
import { parseApiDate } from '@/lib/utils/format';
import { severityRank } from '@/lib/utils/severity';
import type {
  AssetType,
  AttackPath,
  DigitalAsset,
  GraphEdge,
  ProvenanceType,
  RemediationAction,
  SecurityFinding,
  SecurityGraph,
  SeverityLevel,
} from '@/types';

export type StepRole = 'entry' | 'intermediate' | 'target';

/** What we can truthfully say about the finding that supports a step. */
export interface StepFinding {
  id: string;
  /** Where the facts came from; 'id-only' means the source named the finding but supplied no details. */
  source: 'findings' | 'graph' | 'id-only';
  title?: string;
  severity?: SeverityLevel;
  scanner?: string;
  provenance?: ProvenanceType;
  /** True only when the finding exists in the loaded findings list, i.e. /threats?f=<id> can open it. */
  openable: boolean;
}

export interface StepAsset {
  id: string;
  name: string;
  type?: AssetType;
  environment?: string;
  criticality?: string;
  owner?: string;
  /** 'id-only' = the asset is not in the inventory or the graph, so only its id is known. */
  source: 'inventory' | 'graph' | 'id-only';
}

/** The relationship between the PREVIOUS step's asset and this one, if the graph reports one. */
export interface StepRelationship {
  edgeId: string;
  relationship: GraphEdge['relationship'];
  inferred: boolean;
  confidence?: number;
}

export interface PathHop {
  stepNumber: number;
  role: StepRole;
  asset: StepAsset;
  description: string;
  technique?: string;
  mitreTactic?: string;
  finding?: StepFinding;
  /** Relationship arriving at this step (never set on the entry step). */
  relationship?: StepRelationship;
  isChokePoint: boolean;
}

export interface PathModel {
  path: AttackPath;
  hops: PathHop[];
  /** Backend ids to highlight on the graph: exactly what the backend named, nothing added. */
  graphNodeIds: string[];
  /** Distinct findings referenced by the steps, in step order. */
  findings: StepFinding[];
  chokePoint?: StepAsset;
  target?: StepAsset;
  /** Remediation proposals the backend linked to this path or to one of its findings. */
  remediations: RemediationAction[];
}

export interface PathContext {
  assets: DigitalAsset[];
  findings: SecurityFinding[];
  graph: SecurityGraph | null;
  remediations: RemediationAction[] | null;
}

function resolveAsset(id: string, ctx: PathContext, graphIndex: Map<string, SecurityGraph['nodes'][number]>): StepAsset {
  const inventory = ctx.assets.find((a) => a.id === id);
  const node = graphIndex.get(id);
  if (inventory) {
    return {
      id,
      name: inventory.name,
      type: inventory.type,
      environment: inventory.environment,
      criticality: inventory.criticality,
      owner: inventory.owner,
      source: 'inventory',
    };
  }
  if (node && node.type !== 'FINDING') {
    const f = assetFacts(node, undefined);
    return {
      id,
      name: node.label,
      type: f.assetType,
      environment: f.environment,
      criticality: f.criticality,
      owner: f.owner,
      source: 'graph',
    };
  }
  return { id, name: id, source: 'id-only' };
}

function resolveFinding(id: string, ctx: PathContext, graphIndex: Map<string, SecurityGraph['nodes'][number]>): StepFinding {
  const listed = ctx.findings.find((f) => f.id === id);
  if (listed) {
    return { id, source: 'findings', title: listed.title, severity: listed.severity, scanner: listed.scanner, provenance: listed.provenance, openable: true };
  }
  const node = graphIndex.get(id);
  if (node && node.type === 'FINDING') {
    // A graph finding node carries a label, severity and scanner but NO provenance; none is invented.
    return { id, source: 'graph', title: node.label, severity: node.severity, scanner: findingNodeFacts(node).scanner, openable: false };
  }
  return { id, source: 'id-only', openable: false };
}

function relationshipBetween(from: string, to: string, graph: SecurityGraph | null): StepRelationship | undefined {
  if (!graph) return undefined;
  // Prefer the edge in the direction of the path; accept the reverse only if that is all the graph has.
  const forward = graph.edges.find((e) => e.source === from && e.target === to);
  const edge = forward ?? graph.edges.find((e) => e.source === to && e.target === from);
  if (!edge) return undefined;
  return { edgeId: edge.id, relationship: edge.relationship, inferred: edge.inferred, confidence: edge.confidence };
}

export function buildPathModel(path: AttackPath, ctx: PathContext): PathModel {
  const graphIndex = new Map((ctx.graph?.nodes ?? []).map((n) => [n.id, n]));
  const steps = [...path.steps].sort((a, b) => a.stepNumber - b.stepNumber);

  const hops: PathHop[] = steps.map((step, i) => ({
    stepNumber: step.stepNumber,
    role: i === 0 ? 'entry' : i === steps.length - 1 ? 'target' : 'intermediate',
    asset: resolveAsset(step.assetId, ctx, graphIndex),
    description: step.description,
    technique: step.technique || undefined,
    mitreTactic: step.mitreTactic || undefined,
    // the backend sends findingId: null for steps without a finding; null and '' both mean "none"
    finding: step.findingId ? resolveFinding(step.findingId, ctx, graphIndex) : undefined,
    relationship: i === 0 ? undefined : relationshipBetween(steps[i - 1].assetId, step.assetId, ctx.graph),
    isChokePoint: !!path.chokePointAssetId && path.chokePointAssetId === step.assetId,
  }));

  const findingIds = [...new Set(hops.map((h) => h.finding?.id).filter((id): id is string => !!id))];
  const findings = findingIds.map((id) => hops.find((h) => h.finding?.id === id)!.finding!);

  const nodeIds = new Set<string>();
  for (const s of steps) {
    nodeIds.add(s.assetId);
    if (s.findingId) nodeIds.add(s.findingId);
  }

  const remediations = (ctx.remediations ?? []).filter((r) => r.attackPathId === path.id || findingIds.includes(r.findingId));

  return {
    path,
    hops,
    graphNodeIds: [...nodeIds],
    findings,
    chokePoint: path.chokePointAssetId ? resolveAsset(path.chokePointAssetId, ctx, graphIndex) : undefined,
    target: path.crownJewelAssetId ? resolveAsset(path.crownJewelAssetId, ctx, graphIndex) : undefined,
    remediations,
  };
}

/**
 * Order paths for the list: open before mitigated, then by severity, then newest first. This only SORTS what the
 * backend returned; it does not score or choose a "best" path.
 */
export function orderPaths(paths: AttackPath[]): AttackPath[] {
  return [...paths].sort((a, b) => {
    const open = Number(b.status === 'ACTIVE') - Number(a.status === 'ACTIVE');
    if (open) return open;
    const sev = severityRank(a.severity) - severityRank(b.severity);
    if (sev) return sev;
    const time = (parseApiDate(b.createdAt)?.getTime() ?? 0) - (parseApiDate(a.createdAt)?.getTime() ?? 0);
    return time || a.id.localeCompare(b.id);
  });
}

/** Defensive read of the ?p= param: a bounded, trimmed string or null. */
export function parsePathParam(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.trim();
  return v.length > 0 && v.length <= 200 ? v : null;
}
