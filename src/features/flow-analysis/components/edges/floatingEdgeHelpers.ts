import { Position } from 'reactflow';
import { HANDLE_SIZE } from '../nodes/shared/NodeHandles';

interface NodeGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The four connection dots a node offers, by the side they sit on. */
export type HandleSide = 'top' | 'right' | 'bottom' | 'left';

const SIDE_POSITION: Record<HandleSide, Position> = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
};

/** Narrow a stored handle id back to a side, ignoring anything unrecognised. */
export function toHandleSide(id: string | null | undefined): HandleSide | null {
  return id && id in SIDE_POSITION ? (id as HandleSide) : null;
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

// Gap between the target node and the edge endpoint. The arrowhead's tip sits
// exactly on the endpoint (ReactFlow's marker is `-5,-4 0,0 -5,4` about a refX
// of 0), so without a gap the node — which renders above the edges layer —
// would clip it.
//
// It has to clear the connection dot, not just the card: the dot is centered on
// the card's edge, so it reaches HANDLE_SIZE / 2 outward, and a gap of exactly
// that landed the tip on the dot's rim. The two then read as one blob whenever
// a node was hovered. The extra few pixels keep the arrow and the dot legible
// as separate things — which matters now that the dots are the grab targets.
const TARGET_GAP = HANDLE_SIZE / 2 + 4;

// The source end needs to clear the dot too, for the plainer reason that a line
// running to the dot's CENTRE spends its last few pixels underneath the card,
// which renders above the edges layer. Measured, that endpoint sat exactly on
// the card boundary while the target end stood 9px clear - so one end met its
// connector and the other disappeared into the node. Most visible right after
// dragging an end onto a new dot, which is when you are looking at it.
//
// Half a dot, so the line stops on the dot's outer rim and reads as touching
// it. No +4 here: that margin exists to keep the ARROWHEAD legible against the
// dot, and this end has no arrowhead to keep clear.
const SOURCE_GAP = HANDLE_SIZE / 2;

// Where a given side's dot sits. Handles are centered along their side, so this
// matches both the rendered dot and the anchor ReactFlow computes for it —
// which is what keeps a pinned edge's endpoint under its reconnect grab target.
// `gap` pushes the point outward along the side's normal (used on target ends,
// to keep the arrowhead clear of the node).
function sideAnchor(g: NodeGeometry, side: HandleSide, gap = 0) {
  const cx = g.x + g.width / 2;
  const cy = g.y + g.height / 2;
  switch (side) {
    case 'top':
      return { x: cx, y: g.y - gap };
    case 'bottom':
      return { x: cx, y: g.y + g.height + gap };
    case 'left':
      return { x: g.x - gap, y: cy };
    case 'right':
      return { x: g.x + g.width + gap, y: cy };
  }
}

/** The anchor point of a node's connection dot, in flow coordinates. */
export function getHandleAnchor(node: any, side: HandleSide) {
  return sideAnchor(getGeometry(node), side);
}

// The outward direction of each face, used to score how squarely it faces the
// other node.
const NORMAL: Record<HandleSide, { x: number; y: number }> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

// Candidates in preference order. Ties keep the first pair tried, which makes
// the top-down convention (bottom -> top) the default whenever nothing beats
// it — a straight parent/child edge scores the maximum either way.
const SOURCE_ORDER: HandleSide[] = ['bottom', 'top', 'right', 'left'];
const TARGET_ORDER: HandleSide[] = ['top', 'bottom', 'left', 'right'];

/**
 * Pick the faces that point at each other.
 *
 * Each candidate pair is scored by how well the two faces' outward normals line
 * up with the line between their anchors: 1 per end for a dead-on approach, 0
 * for a glancing one, negative for a face pointing away. Stacked nodes still
 * score best on bottom -> top and same-rank neighbours on right -> left, so the
 * tidy cases are unchanged; diagonal ones now get a mixed pair (say bottom ->
 * right) instead of a bottom -> top edge that has to run sideways to get there.
 *
 * That sideways run was what made arrowheads look wrong: markers orient along
 * the path, so an edge nominally entering a node's top while travelling almost
 * horizontally put a sideways arrow above the card, detached from any edge of
 * it. Facing sides keep the approach square to the face the arrow lands on.
 */
function autoSides(
  s: NodeGeometry,
  t: NodeGeometry,
  fixed?: { source?: HandleSide | null; target?: HandleSide | null }
): { source: HandleSide; target: HandleSide } {
  const sourceOptions = fixed?.source ? [fixed.source] : SOURCE_ORDER;
  const targetOptions = fixed?.target ? [fixed.target] : TARGET_ORDER;

  let best = { source: sourceOptions[0], target: targetOptions[0] };
  let bestScore = -Infinity;

  for (const source of sourceOptions) {
    const from = sideAnchor(s, source);
    for (const target of targetOptions) {
      const to = sideAnchor(t, target, TARGET_GAP);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.hypot(dx, dy);
      // Overlapping nodes leave no direction to score; keep the preferred pair
      if (len < 1e-6) continue;
      const ux = dx / len;
      const uy = dy / len;
      const score =
        NORMAL[source].x * ux + NORMAL[source].y * uy +
        NORMAL[target].x * -ux + NORMAL[target].y * -uy;
      if (score > bestScore) {
        bestScore = score;
        best = { source, target };
      }
    }
  }

  return best;
}

/** A dot the user chose, per end. Ends left out fall back to geometry. */
export interface EdgePin {
  source?: string | null;
  target?: string | null;
}

/**
 * The sides an edge actually connects through: whatever the user pinned, and
 * the geometric pick for the ends they didn't. The handle-sync effect writes
 * these back onto the edge as handle ids so ReactFlow's hidden reconnect
 * anchors sit on the endpoints we draw.
 */
export function resolveEdgeSides(
  sourceNode: any,
  targetNode: any,
  pin?: EdgePin
): { source: HandleSide; target: HandleSide } {
  // A pin fixes its end; the free end is then chosen to face it, so a
  // half-pinned edge still meets the other card squarely.
  return autoSides(getGeometry(sourceNode), getGeometry(targetNode), {
    source: toHandleSide(pin?.source),
    target: toHandleSide(pin?.target),
  });
}

/**
 * Coordinates and sides for an edge between two nodes.
 *
 * `pin` names a side to hold on either end — that's how an edge stays on the
 * dots it was drawn or settled on. Ends without one fall back to the geometric
 * pick, which is what an edge uses in the moment before it settles.
 */
export function getEdgeParams(sourceNode: any, targetNode: any, pin?: EdgePin) {
  const s = getGeometry(sourceNode);
  const t = getGeometry(targetNode);
  const { source: sourceSide, target: targetSide } = resolveEdgeSides(sourceNode, targetNode, pin);

  const source = sideAnchor(s, sourceSide, SOURCE_GAP);
  const target = sideAnchor(t, targetSide, TARGET_GAP);

  return {
    sx: source.x,
    sy: source.y,
    tx: target.x,
    ty: target.y,
    sourcePos: SIDE_POSITION[sourceSide],
    targetPos: SIDE_POSITION[targetSide],
  };
}
