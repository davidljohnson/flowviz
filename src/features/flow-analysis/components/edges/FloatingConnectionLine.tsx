import React, { useCallback } from 'react';
import { getBezierPath, useStore, ConnectionLineComponentProps } from 'reactflow';
import { getEdgeEndpoint, getEdgeParams, toHandleSide, sidePosition } from './floatingEdgeHelpers';

// The preview line while dragging a new connection.
//
// Both ends are drawn where the finished edge will put them. The far end used
// to follow the cursor exactly, which meant that once the pointer was over a
// node the line carried on past the connection dot and under the card, ending
// somewhere inside it — then snapped back out to the dot on release. React Flow
// tells us which dot the drop would land on (connectionEndHandle, set only
// while the connection is valid), so the preview finishes there instead and
// release changes nothing but the line's style.
//
// The end is measured as a target end. Every dot is declared a source and the
// flow runs in Loose mode, so the handle's own type cannot say which end of a
// reconnect is moving; the moving end is the arrow end in all but the case of
// dragging an edge's start, where this sits 4px from where it lands.
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
  // The dot the drop would land on, or null while the cursor is over open
  // canvas. Read before the early return so the hook order never changes.
  const endHandle = useStore(s => s.connectionEndHandle);
  const endNode = useStore(
    useCallback((s) => (endHandle ? s.nodeInternals.get(endHandle.nodeId) : undefined), [endHandle]),
  );
  const endSide = toHandleSide(endHandle?.handleId);
  const snapped = endNode && endSide
    ? { ...getEdgeEndpoint(endNode, endSide, 'target'), position: sidePosition(endSide) }
    : null;

  if (!fromNode) {
    return null;
  }

  const fromSide = toHandleSide(fromHandle?.id);

  const { sx, sy, tx, ty, sourcePos, targetPos } = fromSide
    ? (() => {
        const anchor = getEdgeEndpoint(fromNode, fromSide, 'source');
        return {
          sx: anchor.x,
          sy: anchor.y,
          tx: snapped ? snapped.x : toX,
          ty: snapped ? snapped.y : toY,
          sourcePos: fromHandle!.position,
          targetPos: snapped ? snapped.position : toPosition,
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
          // The snap applies here too: which dot the drop lands on does not
          // depend on whether we could identify the one it started from.
          ...(snapped && { tx: snapped.x, ty: snapped.y }),
          sourcePos: params.sourcePos || fromPosition,
          targetPos: snapped ? snapped.position : (params.targetPos || toPosition),
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
