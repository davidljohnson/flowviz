import { Position } from 'reactflow';

interface NodeGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getGeometry(node: any): NodeGeometry {
  // Handle internal node structure from useStore - fallback to positionAbsolute
  const pos = node.position || node.positionAbsolute || node.internals?.positionAbsolute || { x: 0, y: 0 };
  const width = node.width || 200;
  const height = node.height || 120;
  // The flow renders with nodeOrigin [0.5, 0.5], so a node's position is its
  // CENTER - convert to top-left for the edge anchor math below
  return {
    x: pos.x - width / 2,
    y: pos.y - height / 2,
    width,
    height,
  };
}

// Get the coordinates and sides for an edge between two nodes.
// Vertical (parent -> child) edges connect bottom -> top as usual; nodes on
// the same rank connect side-to-side so the edge doesn't squeeze an S-curve
// through the narrow gap between sibling cards.
export function getEdgeParams(sourceNode: any, targetNode: any) {
  const s = getGeometry(sourceNode);
  const t = getGeometry(targetNode);

  const sourceCenter = { x: s.x + s.width / 2, y: s.y + s.height / 2 };
  const targetCenter = { x: t.x + t.width / 2, y: t.y + t.height / 2 };

  const isLateral =
    Math.abs(sourceCenter.y - targetCenter.y) < Math.max(s.height, t.height) / 2;

  if (isLateral) {
    if (sourceCenter.x <= targetCenter.x) {
      return {
        sx: s.x + s.width,
        sy: sourceCenter.y,
        tx: t.x,
        ty: targetCenter.y,
        sourcePos: Position.Right,
        targetPos: Position.Left,
      };
    }
    return {
      sx: s.x,
      sy: sourceCenter.y,
      tx: t.x + t.width,
      ty: targetCenter.y,
      sourcePos: Position.Left,
      targetPos: Position.Right,
    };
  }

  if (sourceCenter.y > targetCenter.y) {
    return {
      sx: sourceCenter.x,
      sy: s.y,
      tx: targetCenter.x,
      ty: t.y + t.height,
      sourcePos: Position.Top,
      targetPos: Position.Bottom,
    };
  }

  return {
    sx: sourceCenter.x,
    sy: s.y + s.height,
    tx: targetCenter.x,
    ty: t.y,
    sourcePos: Position.Bottom,
    targetPos: Position.Top,
  };
}
