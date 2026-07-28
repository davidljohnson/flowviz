import React from 'react';
import { getBezierPath, ConnectionLineComponentProps } from 'reactflow';
import { getEdgeParams, getHandleAnchor, toHandleSide } from './floatingEdgeHelpers';

// The preview line while dragging a new connection.
//
// It starts at the dot you grabbed and stays there for the whole drag —
// `fromHandle` names that handle (unlike fromX/fromY, which always report the
// node's first handle of that type, and which is why this used to float the
// origin to whichever side was nearest the cursor). Only if the handle can't be
// identified do we fall back to that nearest-side guess.
const FloatingConnectionLine: React.FC<ConnectionLineComponentProps> = ({
  toX,
  toY,
  fromPosition,
  toPosition,
  fromNode,
  fromHandle,
}) => {
  if (!fromNode) {
    return null;
  }

  const fromSide = toHandleSide(fromHandle?.id);

  const { sx, sy, tx, ty, sourcePos, targetPos } = fromSide
    ? (() => {
        const anchor = getHandleAnchor(fromNode, fromSide);
        return {
          sx: anchor.x,
          sy: anchor.y,
          tx: toX,
          ty: toY,
          sourcePos: fromHandle!.position,
          targetPos: toPosition,
        };
      })()
    : (() => {
        // Mock a 1x1 target at the cursor so getEdgeParams picks the nearest
        // source side — the old behaviour, kept for handles we can't identify.
        const targetNode = {
          id: 'connection-target',
          width: 1,
          height: 1,
          position: { x: toX, y: toY },
          internals: {
            positionAbsolute: { x: toX, y: toY },
          },
        };
        const params = getEdgeParams(fromNode, targetNode);
        return {
          ...params,
          sourcePos: params.sourcePos || fromPosition,
          targetPos: params.targetPos || toPosition,
        };
      })();

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
    targetX: tx,
    targetY: ty,
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
        cx={tx}
        cy={ty}
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
