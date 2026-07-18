import { useCallback } from 'react';
import {
  useStore,
  BaseEdge,
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
  EdgeProps,
  Position,
} from 'reactflow';
import { getEdgeParams } from './floatingEdgeHelpers';

// Edge that picks its connection sides from node geometry: bottom -> top for
// parent/child ranks, side-to-side for same-rank neighbors. Honors the
// edge-curve setting via data.curve ('smooth' | 'straight' | 'step').
function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style,
  label,
  labelStyle,
  labelBgStyle,
  data,
}: EdgeProps) {
  const sourceNode = useStore(
    useCallback((store) => store.nodeInternals.get(source), [source])
  );
  const targetNode = useStore(
    useCallback((store) => store.nodeInternals.get(target), [target])
  );

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);
  const isLateral = sourcePos === Position.Left || sourcePos === Position.Right;

  const curve = data?.curve || 'smooth';
  let edgePath: string;
  let labelX: number;
  let labelY: number;

  if (curve === 'straight') {
    [edgePath, labelX, labelY] = getStraightPath({
      sourceX: sx,
      sourceY: sy,
      targetX: tx,
      targetY: ty,
    });
  } else if (curve === 'step') {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX: sx,
      sourceY: sy,
      sourcePosition: sourcePos,
      targetPosition: targetPos,
      targetX: tx,
      targetY: ty,
    });
  } else {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX: sx,
      sourceY: sy,
      sourcePosition: sourcePos,
      targetPosition: targetPos,
      targetX: tx,
      targetY: ty,
    });
  }

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      style={style}
      label={label}
      labelX={labelX}
      // Side-to-side edges are short: float the label above the line so it
      // doesn't get pinched between the two cards
      labelY={isLateral ? labelY - 14 : labelY}
      labelStyle={labelStyle}
      labelShowBg
      labelBgStyle={labelBgStyle}
    />
  );
}

export default FloatingEdge;
