import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crosshair, Network } from 'lucide-react';
import { AsyncBoundary } from '@/components/common/AsyncBoundary';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/States';
import { Badge } from '@/components/ui/Badge';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { useDataSource } from '@/app/providers/DataSourceProvider';
import { useSourceData } from '@/hooks/useSourceData';
import { indexById } from '@/lib/utils/format';
import type { AttackPath, DigitalAsset, SecurityFinding, SecurityGraph } from '@/types';
import { GraphCanvas, GraphLegend } from './GraphCanvas';
import { NodeInspector } from './NodeInspector';

interface GraphBundle {
  graph: SecurityGraph;
  assets: DigitalAsset[];
  findings: SecurityFinding[];
  /** Attack paths are optional here: the contract does not declare them yet, so failure is tolerated. */
  paths: AttackPath[];
}

/** Display-only: which nodes/edges belong to a path, using the ids the backend supplied. */
function pathHighlight(graph: SecurityGraph, path: AttackPath | undefined) {
  const nodes = new Set<string>();
  const edges = new Set<string>();
  if (!path) return { nodes, edges };
  for (const step of path.steps) {
    nodes.add(step.assetId);
    if (step.findingId) nodes.add(step.findingId);
  }
  const assetIds = new Set(path.steps.map((s) => s.assetId));
  for (const edge of graph.edges) {
    // Highlight the hops between consecutive path assets (not the finding attachments).
    if (assetIds.has(edge.source) && assetIds.has(edge.target)) edges.add(edge.id);
  }
  return { nodes, edges };
}

function GraphWorkspace({ bundle }: { bundle: GraphBundle }) {
  const { source } = useDataSource();
  const { graph, assets, findings, paths } = bundle;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPath, setShowPath] = useState(false);

  const assetIndex = useMemo(() => indexById(assets), [assets]);
  const findingIndex = useMemo(() => indexById(findings), [findings]);
  const activePath = paths.find((p) => p.status === 'ACTIVE') ?? paths[0];
  const highlight = useMemo(
    () => pathHighlight(graph, showPath ? activePath : undefined),
    [graph, activePath, showPath],
  );
  const selectedNode = graph.nodes.find((n) => n.id === selectedId) ?? null;

  if (graph.nodes.length === 0) {
    return (
      <EmptyState
        icon={<Network className="h-7 w-7" aria-hidden />}
        title="The graph is empty"
        description="The backend returned no nodes. Run an assessment, or switch to the local preview data to evaluate the layout."
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Panel aria-labelledby="graph-title">
        <PanelHeader
          id="graph-title"
          title="Relationship map"
          description="Repository, exposed credential, IAM role and cloud storage"
          action={
            activePath ? (
              <button
                type="button"
                aria-pressed={showPath}
                onClick={() => setShowPath((v) => !v)}
                className={
                  showPath
                    ? 'inline-flex h-8 items-center gap-1.5 rounded-md border border-sev-critical/50 bg-sev-critical/10 px-2.5 text-xs font-medium text-sev-critical'
                    : 'inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-ink-800 px-2.5 text-xs font-medium text-fg hover:bg-ink-700'
                }
              >
                <Crosshair className="h-3.5 w-3.5" aria-hidden />
                {showPath ? 'Highlighting potential path' : 'Highlight potential path'}
              </button>
            ) : undefined
          }
        />
        <div className="space-y-3 p-4">
          <GraphCanvas graph={graph} selectedId={selectedId} onSelect={setSelectedId} highlight={highlight} origin={source.origin} />
          <GraphLegend origin={source.origin} />
          {showPath && activePath && (
            <p className="rounded-md border border-line bg-ink-900 px-3 py-2 text-xs leading-relaxed text-fg-soft">
              <span className="font-semibold text-fg">Potential path, not a confirmed exploit.</span> It is an inferred
              chain of relationships{activePath.isSimulated ? ' in a simulated scenario' : ''}. No exploitation has been
              performed or verified.{' '}
              <Link to="/paths" className="font-medium text-signal underline underline-offset-2">
                Investigate path
              </Link>
            </p>
          )}
        </div>
      </Panel>

      <Panel aria-labelledby="inspector-title" className="self-start">
        <PanelHeader id="inspector-title" title="Selected node" />
        <NodeInspector node={selectedNode} graph={graph} assets={assetIndex} findings={findingIndex} />
      </Panel>
    </div>
  );
}

export function SecurityGraphView() {
  const { source } = useDataSource();
  const { state, reload } = useSourceData<GraphBundle>(async (src, signal) => {
    const [graph, assets, findings, paths] = await Promise.all([
      src.getSecurityGraph(signal),
      src.getAssets(signal),
      src.getFindings(signal),
      // Not in openapi.yaml yet: a missing endpoint must not break the graph itself.
      src.getAttackPaths(signal).catch(() => [] as AttackPath[]),
    ]);
    return { graph, assets, findings, paths };
  });

  return (
    <>
      <PageHeader
        title="Business Security Graph"
        description="How assets and findings relate across application, infrastructure and external surface. Inferred links are shown separately from verified ones."
        actions={
          source.origin === 'SIMULATED_DEMO' ? (
            <Badge tone="sim">Simulated demo data</Badge>
          ) : (
            <Badge tone="signal">Backend data</Badge>
          )
        }
      />
      <AsyncBoundary state={state} onRetry={reload} skeletonRows={6} label="Loading graph">
        {(bundle) => <GraphWorkspace bundle={bundle} />}
      </AsyncBoundary>
    </>
  );
}
