import { Handle, Position } from 'reactflow';

// Hidden by default; the node's :hover rule in editing.css fades them in so
// "drag from a handle to connect / branch a new node" is discoverable without
// cluttering the canvas at rest.
// An even size (10px) keeps ReactFlow's translateX(-50%) centering transform
// on a whole pixel (-5px), avoiding the sub-pixel shift a 9px dot produced.
// Exported because the edge geometry has to stop short of the dot — see
// TARGET_GAP in floatingEdgeHelpers.
export const HANDLE_SIZE = 10;
// Straddle the visible node edge exactly (dot center on the border-box edge).
// -HANDLE_SIZE/2 alone sat the dot slightly inside (handles are placed against
// the padding box); a half-pixel of border compensation centers it on the edge
// so it neither sinks in nor overhangs.
const HANDLE_OFFSET = -(HANDLE_SIZE / 2) - 0.5; // -5.5px
const handleStyle = {
  background: 'rgba(var(--fv-overlay-rgb), 0.6)',
  width: HANDLE_SIZE,
  height: HANDLE_SIZE,
  border: '2px solid rgba(var(--fv-panel-rgb), 0.9)',
  opacity: 0,
  zIndex: 10,
};

// A connection dot on every side. The flow renders with ConnectionMode.Loose,
// so all four are interchangeable connection points — you can start or land a
// connection at any of them.
//
// The ids name the side, and that name is what an edge records when the user
// draws or reconnects it (see FloatingEdge): dots the user picked hold their
// side, while AI-generated edges leave the ids to the handle-sync effect and
// keep re-routing to whichever sides sit closest.
//
// All four are type="source", which looks odd but is what makes any side usable
// as either end. ReactFlow resolves an edge's TARGET handle against both lists
// under Loose mode, but its SOURCE handle against the source list alone — so a
// top/left handle typed as a target can never be named as an edge's source, and
// EdgeRenderer silently drops (returns null for) any edge that tries. Loose
// mode ignores the types when validating a connection, and nothing else reads
// them, so making them uniform costs nothing and keeps every side legal.
export function NodeHandles() {
  return (
    <>
      <Handle
        id="top"
        type="source"
        position={Position.Top}
        style={{ ...handleStyle, top: HANDLE_OFFSET }}
      />
      <Handle
        id="left"
        type="source"
        position={Position.Left}
        style={{ ...handleStyle, left: HANDLE_OFFSET }}
      />
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        style={{ ...handleStyle, right: HANDLE_OFFSET }}
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        style={{ ...handleStyle, bottom: HANDLE_OFFSET }}
      />
    </>
  );
}
