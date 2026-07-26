import React from 'react';
import { getBezierPath, ConnectionLineComponentProps } from 'reactflow';
import { getEdgeParams } from './floatingEdgeHelpers';

// The preview line while dragging a new connection. ReactFlow can't tell which
// of a node's several same-type handles you grabbed (its fromX/fromY always
// report the first handle), so instead of pinning to a wrong handle we anchor
// the source to the side of the node nearest the cursor — it follows the drag.
const FloatingConnectionLine: React.FC<ConnectionLineComponentProps> = ({
  toX,
  toY,
  fromPosition,
  toPosition,
  fromNode,
}) => {
  if (!fromNode) {
    return null;
  }

  // Mock a 1x1 target at the cursor so getEdgeParams picks the nearest source side.
  const targetNode = {
    id: 'connection-target',
    width: 1,
    height: 1,
    position: { x: toX, y: toY },
    internals: {
      positionAbsolute: { x: toX, y: toY },
    },
  };

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(fromNode, targetNode);

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos || fromPosition,
    targetPosition: targetPos || toPosition,
    targetX: tx || toX,
    targetY: ty || toY,
  });

  return (
    <g>
      {/* Colors go through `style`, not the fill/stroke presentation
          attributes: var() only resolves in CSS, and these have to track the
          theme. */}
      <path
        fill="none"
        style={{ stroke: 'rgba(var(--fv-overlay-rgb), 0.5)' }}
        strokeWidth={1.5}
        strokeDasharray="4 4"
        className="animated"
        d={edgePath}
      />
      <circle
        cx={tx || toX}
        cy={ty || toY}
        style={{
          fill: 'var(--fv-canvas-handle)',
          stroke: 'rgba(var(--fv-overlay-rgb), 0.5)',
        }}
        r={3}
        strokeWidth={1.5}
      />
    </g>
  );
};

export default FloatingConnectionLine;
