import { Handle, Position } from 'reactflow';

// Hidden by default; the node's :hover rule in editing.css fades them in so
// "drag from a handle to connect / branch a new node" is discoverable without
// cluttering the canvas at rest.
// An even size (10px) keeps ReactFlow's translateX(-50%) centering transform
// on a whole pixel (-5px), avoiding the sub-pixel shift a 9px dot produced.
const HANDLE_SIZE = 10;
// Straddle the visible node edge exactly (dot center on the border-box edge).
// -HANDLE_SIZE/2 alone sat the dot slightly inside (handles are placed against
// the padding box); a half-pixel of border compensation centers it on the edge
// so it neither sinks in nor overhangs.
const HANDLE_OFFSET = -(HANDLE_SIZE / 2) - 0.5; // -5.5px
const handleStyle = {
  background: 'rgba(255, 255, 255, 0.6)',
  width: HANDLE_SIZE,
  height: HANDLE_SIZE,
  border: '2px solid rgba(13, 17, 23, 0.9)',
  opacity: 0,
  zIndex: 10,
};

// A connection dot on every side. The flow renders with ConnectionMode.Loose,
// so all four are interchangeable connection points — you can start or land a
// connection at any of them, and FloatingEdge routes to whichever sides sit
// closest. Types follow the top-down convention (top/left incoming,
// bottom/right outgoing) which only drives the add-connected-node direction.
export function NodeHandles() {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ ...handleStyle, top: HANDLE_OFFSET }}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{ ...handleStyle, left: HANDLE_OFFSET }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ ...handleStyle, right: HANDLE_OFFSET }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ ...handleStyle, bottom: HANDLE_OFFSET }}
      />
    </>
  );
}
