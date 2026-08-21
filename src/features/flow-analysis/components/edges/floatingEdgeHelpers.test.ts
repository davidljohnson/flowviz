import { describe, it, expect } from 'vitest';
import { Position } from 'reactflow';
import { getEdgeParams, getHandleAnchor, resolveEdgeSides, toHandleSide } from './floatingEdgeHelpers';
import { HANDLE_SIZE, NodeHandles } from '../nodes/shared/NodeHandles';

// Positions are node CENTERS: the flow renders with nodeOrigin [0.5, 0.5].
const node = (x: number, y: number) => ({ id: `${x},${y}`, position: { x, y }, width: 200, height: 100 });

const ABOVE = node(0, 0);
const BELOW = node(0, 400);
const RIGHT_OF = node(400, 0);

// The cards the canvas actually draws.
const card = (x: number, y: number) => ({ id: `${x},${y}`, position: { x, y }, width: 210, height: 78 });

describe('the dots the router is allowed to name', () => {
  const declared = ((NodeHandles() as any).props.children as any[]).map(c => ({
    id: c.props.id as string,
    type: c.props.type as string,
  }));

  it('offers a dot on all four sides', () => {
    expect(declared.map(h => h.id).sort()).toEqual(['bottom', 'left', 'right', 'top']);
  });

  it('declares every one as a source', () => {
    // ReactFlow resolves an edge's TARGET handle against both type lists under
    // ConnectionMode.Loose, but its SOURCE handle against the source list
    // alone. Type any of these as a target and EdgeRenderer silently drops
    // (returns null for) every edge the router routes out of that side.
    expect(declared.filter(h => h.type !== 'source')).toEqual([]);
  });

  it('can name any of them as an edge source', () => {
    const sources = new Set(declared.filter(h => h.type === 'source').map(h => h.id));
    // Every side autoSides can pick has to be in that set
    const pairs = [
      [card(0, 0), card(0, 300)], [card(0, 300), card(0, 0)],
      [card(0, 0), card(400, 0)], [card(400, 0), card(0, 0)],
      [card(620, 280), card(360, 380)], [card(340, 220), card(620, 280)],
    ] as const;
    for (const [s, t] of pairs) {
      expect(sources.has(resolveEdgeSides(s, t).source)).toBe(true);
    }
  });
});

describe('toHandleSide', () => {
  it('accepts the four side ids', () => {
    expect(toHandleSide('top')).toBe('top');
    expect(toHandleSide('left')).toBe('left');
  });

  it('rejects anything else, so a stale id falls back to geometry', () => {
    expect(toHandleSide(null)).toBeNull();
    expect(toHandleSide(undefined)).toBeNull();
    expect(toHandleSide('a')).toBeNull();
  });
});

describe('resolveEdgeSides', () => {
  it('routes bottom -> top down a rank', () => {
    expect(resolveEdgeSides(ABOVE, BELOW)).toEqual({ source: 'bottom', target: 'top' });
  });

  it('routes top -> bottom when the source sits below', () => {
    expect(resolveEdgeSides(BELOW, ABOVE)).toEqual({ source: 'top', target: 'bottom' });
  });

  it('routes side-to-side between neighbours on the same rank', () => {
    expect(resolveEdgeSides(ABOVE, RIGHT_OF)).toEqual({ source: 'right', target: 'left' });
    expect(resolveEdgeSides(RIGHT_OF, ABOVE)).toEqual({ source: 'left', target: 'right' });
  });

  it('lets a pin win over geometry, one end at a time', () => {
    expect(resolveEdgeSides(ABOVE, BELOW, { source: 'left' }))
      .toEqual({ source: 'left', target: 'top' });
    expect(resolveEdgeSides(ABOVE, BELOW, { source: 'left', target: 'right' }))
      .toEqual({ source: 'left', target: 'right' });
  });

  it('ignores a pin that names no real dot', () => {
    expect(resolveEdgeSides(ABOVE, BELOW, { source: null, target: 'nonsense' }))
      .toEqual({ source: 'bottom', target: 'top' });
  });

  it('picks the free end to face a pinned one', () => {
    // Source held on the right: the target should be met on the side that
    // approach actually arrives at, not the top-down default.
    expect(resolveEdgeSides(node(0, 0), node(600, 0), { source: 'right' }).target).toBe('left');
  });
});

describe('getEdgeParams', () => {
  it('falls back to geometry when nothing is pinned', () => {
    const p = getEdgeParams(ABOVE, BELOW);
    expect(p.sourcePos).toBe(Position.Bottom);
    expect(p.targetPos).toBe(Position.Top);
    // ABOVE's bottom edge is y=50; the endpoint stands half a dot clear of it.
    expect([p.sx, p.sy]).toEqual([0, 50 + HANDLE_SIZE / 2]);
  });

  it('holds a pinned side even when geometry disagrees', () => {
    const p = getEdgeParams(ABOVE, BELOW, { source: 'left', target: 'right' });
    expect(p.sourcePos).toBe(Position.Left);
    expect(p.targetPos).toBe(Position.Right);
    expect([p.sx, p.sy]).toEqual([-100 - HANDLE_SIZE / 2, 0]);
  });

  it('pins one end and leaves the other floating', () => {
    const p = getEdgeParams(ABOVE, BELOW, { source: 'right', target: null });
    expect(p.sourcePos).toBe(Position.Right);
    expect(p.targetPos).toBe(Position.Top);
  });

  it('agrees with the sides the handle-sync effect writes', () => {
    const pin = { source: 'left' };
    const sides = resolveEdgeSides(ABOVE, BELOW, pin);
    const p = getEdgeParams(ABOVE, BELOW, pin);
    const dot = getHandleAnchor(ABOVE, sides.source);
    // Straight out from that dot: same axis, one half-dot clear of it.
    expect(p.sy).toBe(dot.y);
    expect(dot.x - p.sx).toBe(HANDLE_SIZE / 2);
  });

  it('starts a pinned edge on the rim of the dot it names', () => {
    const p = getEdgeParams(ABOVE, BELOW, { source: 'bottom' });
    const dot = getHandleAnchor(ABOVE, 'bottom');
    // On the dot, not under the card. Running the line to the dot's CENTRE put
    // its last few pixels beneath the card, which paints above the edges layer,
    // so the line read as disappearing into the node rather than meeting its
    // connector - most obvious right after dragging that end onto a new dot.
    //
    // Exactly a half-dot, which is the rim: far enough to clear the card, near
    // enough to still touch the dot. The arrowhead end stands further off
    // because it has a marker to keep legible against the dot; this end has
    // none, so it has nothing to buy with the extra distance.
    expect(p.sx).toBe(dot.x);
    expect(p.sy - dot.y).toBe(HANDLE_SIZE / 2);
  });

  it('keeps the target endpoint clear of the connection dot', () => {
    // The arrowhead's tip sits on the endpoint and the dot is centered on the
    // card edge, reaching HANDLE_SIZE / 2 outward. Land the tip inside that and
    // the arrow and the dot merge into one blob on hover.
    const p = getEdgeParams(ABOVE, BELOW, { target: 'top' });
    const dot = getHandleAnchor(BELOW, 'top');
    expect(p.tx).toBe(dot.x);
    expect(dot.y - p.ty).toBeGreaterThan(HANDLE_SIZE / 2);
    // ...but not so far that the edge looks detached from the card it points at
    expect(dot.y - p.ty).toBeLessThan(HANDLE_SIZE * 1.5);
  });
});

describe('side choice on diagonals', () => {
  it('does not route bottom -> top when the target sits above the source anchor', () => {
    // Target is down-right but only just: bottom -> top would have to double
    // back upward to reach a top anchor that sits above the source's bottom.
    const sides = resolveEdgeSides(card(340, 220), card(620, 280));
    expect(sides).toEqual({ source: 'right', target: 'left' });
  });

  it('meets a mostly-sideways neighbour on a face that points at it', () => {
    const sides = resolveEdgeSides(card(620, 280), card(360, 380));
    expect(sides.target).not.toBe('top');
    expect(['left', 'bottom']).toContain(sides.source);
    expect(['right', 'top']).toContain(sides.target);
  });

  it('still stacks bottom -> top for a straight parent/child', () => {
    expect(resolveEdgeSides(card(0, 0), card(0, 300))).toEqual({ source: 'bottom', target: 'top' });
  });

  it('still runs right -> left between same-rank siblings', () => {
    expect(resolveEdgeSides(card(0, 0), card(400, 0))).toEqual({ source: 'right', target: 'left' });
  });

  it('keeps the approach square to the face the arrow lands on', () => {
    // The arrowhead orients along the path, so the last leg has to run roughly
    // along the target face's inward normal or the arrow looks detached.
    const pairs: Array<[ReturnType<typeof card>, ReturnType<typeof card>]> = [
      [card(340, 220), card(620, 280)],
      [card(620, 280), card(360, 380)],
      [card(620, 280), card(840, 420)],
      [card(0, 0), card(0, 300)],
      [card(0, 0), card(400, 0)],
    ];
    const inward = { top: { x: 0, y: 1 }, bottom: { x: 0, y: -1 }, left: { x: 1, y: 0 }, right: { x: -1, y: 0 } };
    for (const [s, t] of pairs) {
      const p = getEdgeParams(s, t);
      const sides = resolveEdgeSides(s, t);
      const dx = p.tx - p.sx;
      const dy = p.ty - p.sy;
      const len = Math.hypot(dx, dy);
      const n = inward[sides.target];
      const alignment = (dx / len) * n.x + (dy / len) * n.y;
      expect(alignment).toBeGreaterThan(0);
    }
  });
});
