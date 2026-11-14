import { Handle, Position } from '@xyflow/react';

const SIDES = [
  { id: 'l', position: Position.Left },
  { id: 'r', position: Position.Right },
  { id: 't', position: Position.Top },
  { id: 'b', position: Position.Bottom },
] as const;

/**
 * Invisible connection points. Edges pick the facing side (see `edgeHandles` in model.ts). Connecting by
 * hand is disabled on the canvas, so these are purely anchors and are hidden from assistive technology.
 */
export function NodeHandles() {
  return (
    <>
      {SIDES.map(({ id, position }) => (
        <span key={id}>
          <Handle id={id} type="source" position={position} isConnectable={false} className="!h-px !w-px !border-0 !bg-transparent !opacity-0" />
          <Handle id={id} type="target" position={position} isConnectable={false} className="!h-px !w-px !border-0 !bg-transparent !opacity-0" />
        </span>
      ))}
    </>
  );
}
