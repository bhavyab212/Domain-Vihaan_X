import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import { cn } from '@/lib/utils/cn';
import { EDGE_COLOR, type RelationshipFlowEdge } from '../model';

/**
 * Relationship edge.
 *
 *  verified (recorded)  -> solid blue
 *  inferred             -> dashed cyan, with the engine confidence when supplied
 *  active potential path-> red; flows (animated) ONLY for on-path edges and never under reduced motion
 *
 * The line style alone (solid vs dashed) already distinguishes inferred from verified, so no information
 * depends on motion or colour. Labels sit on a dark plate for contrast and are pointer-transparent so they
 * never block dragging a node.
 */
function AttackEdgeImpl({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps<RelationshipFlowEdge>) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  if (!data) return null;

  const color = data.onPath ? EDGE_COLOR.path : data.inferred ? EDGE_COLOR.inferred : EDGE_COLOR.verified;
  const dashed = data.inferred || data.animated;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={0}
        className={cn(data.animated && 'edge-flow')}
        style={{
          stroke: color,
          strokeWidth: data.onPath ? 2.75 : data.connected ? 2.25 : 1.75,
          strokeDasharray: dashed ? '7 5' : undefined,
          opacity: data.dim ? 0.25 : 1,
          transition: 'opacity 150ms',
        }}
      />
      <EdgeLabelRenderer>
        <div
          data-testid="edge-label"
          data-edge-id={id}
          data-inferred={data.inferred}
          data-on-path={data.onPath}
          data-animated={data.animated}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, opacity: data.dim ? 0.3 : 1 }}
          className={cn(
            'pointer-events-none absolute rounded border bg-ink-950/95 px-1.5 py-0.5 text-center text-[10.5px] leading-tight',
            data.onPath ? 'border-sev-critical/50' : 'border-line',
          )}
        >
          <span className={cn('block', data.onPath ? 'text-[#F59AA6]' : 'text-fg-soft')}>{data.label}</span>
          <span className={cn('block', data.inferred ? 'text-signal' : 'text-[#8FA9FF]')}>{data.sublabel}</span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const AttackEdge = memo(AttackEdgeImpl);
