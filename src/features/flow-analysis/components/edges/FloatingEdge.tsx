import { useCallback, useState } from 'react';
import {
  useStore,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
  EdgeProps,
  Position,
} from 'reactflow';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { getEdgeParams, type EdgePin } from './floatingEdgeHelpers';
import { useEdgeActions } from '../../../flow-editing/context/EdgeActionsContext';

// Edge that picks its connection sides from node geometry: bottom -> top for
// parent/child ranks, side-to-side for same-rank neighbors. Honors the
// edge-curve setting via data.curve ('smooth' | 'straight' | 'step').
//
// `data.pin` overrides that per end, and in practice every edge ends up with
// one: the user's dots if they drew or reconnected it, otherwise the sides it
// settled on once the layout stopped moving (see the settle effect in
// StreamingFlowVisualization). So an edge holds its connection points while
// nodes are dragged around, and only Clean up layout re-faces it. The geometric
// fallback below still matters for the moment before an edge settles.
//
// Note the pin lives in data, not in sourceHandle/targetHandle — those ids are
// kept in sync with the sides actually drawn and so can't also carry intent.
function FloatingEdge({
  id,
  source,
  target,
  markerEnd,
  style,
  label,
  selected,
  data,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const edgeActions = useEdgeActions();

  const sourceNode = useStore(
    useCallback((store) => store.nodeInternals.get(source), [source])
  );
  const targetNode = useStore(
    useCallback((store) => store.nodeInternals.get(target), [target])
  );

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty, sourcePos, targetPos } =
    getEdgeParams(sourceNode, targetNode, data?.pin as EdgePin | undefined);
  const isLateral = sourcePos === Position.Left || sourcePos === Position.Right;
  const active = hovered || Boolean(selected);

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

  const hasLabel = typeof label === 'string' && label.trim().length > 0;
  // Side-to-side edges are short: float the control above the line so it
  // doesn't get pinched between the two cards
  const midY = isLateral ? labelY - 14 : labelY;

  // Selected edges just get thicker — keep their own color and dash.
  const edgeStyle: React.CSSProperties = selected
    ? { ...style, strokeWidth: 3, opacity: 1 }
    : (style ?? {});

  const openEditor = (event: React.MouseEvent) => {
    // Don't let the click bubble to the edge (which would select it)
    event.stopPropagation();
    edgeActions?.onEditLabel(id, hasLabel ? String(label) : '', {
      x: event.clientX,
      y: event.clientY,
    });
  };

  // The midpoint control shows an existing label, or the "add label" affordance
  // while the edge is hovered/selected.
  const showControl = hasLabel || active;

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
      {/* Invisible wide hover target over the line so hovering anywhere along
          the edge reveals the label affordance. No onClick — clicks bubble to
          ReactFlow so edge selection still works. */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={22}
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {showControl && (
        <EdgeLabelRenderer>
          <div
            className="fv-edge-label nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${midY}px)`,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {hasLabel ? (
              <button
                type="button"
                className={`fv-edge-pill${selected ? ' fv-edge-pill--selected' : ''}`}
                onClick={openEditor}
              >
                {label}
              </button>
            ) : active ? (
              <button
                type="button"
                className="fv-edge-pill fv-edge-pill--ghost"
                onClick={openEditor}
              >
                <AddRoundedIcon sx={{ fontSize: 13 }} />
                Label
              </button>
            ) : null}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default FloatingEdge;
