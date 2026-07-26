import type { ComponentType } from 'react';

/**
 * The non-visual half of ReactFlow's `NodeProps`. Node components read only
 * `data` and `selected`; the rest is filled in once here so preview cells stay
 * about the content.
 */
const base = { id: 'n1', xPos: 0, yPos: 0, zIndex: 0, isConnectable: false, dragging: false };

/** Renders a node component at the width it occupies on the canvas. */
export const NodeFrame = ({
  as: Node,
  data,
  selected = false,
  width = 240,
}: {
  as: ComponentType<never>;
  data: Record<string, unknown>;
  selected?: boolean;
  width?: number;
}) => (
  <div style={{ width }}>
    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
    <Node {...({ ...base, type: data.type, data, selected } as any)} />
  </div>
);
