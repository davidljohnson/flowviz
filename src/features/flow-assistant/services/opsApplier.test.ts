import { describe, it, expect } from 'vitest';
import { Node, Edge } from 'reactflow';
import { applyAssistantOps, AssistantEdgeConfig, OpsSessionOptions } from './opsApplier';
import { AssistantOp } from '../types';

const edgeConfig: AssistantEdgeConfig = {
  type: 'floating',
  data: { curve: 'smooth' },
  style: { stroke: 'white' },
};

const node = (id: string, name = id, type = 'malware'): Node => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data: { id, type, name, description: '' },
});

const edge = (id: string, source: string, target: string): Edge => ({
  id,
  source,
  target,
  type: 'floating',
});

const apply = (
  nodes: Node[],
  edges: Edge[],
  ops: AssistantOp[],
  options?: OpsSessionOptions,
) => applyAssistantOps({ nodes, edges, ops, edgeConfig, options });

describe('applyAssistantOps', () => {
  it('adds a node with sanitized data and resolves its ref in later ops', () => {
    const result = apply([node('n1', 'Loader')], [], [
      {
        op: 'add_node',
        ref: 'new1',
        nodeType: 'infrastructure',
        near: 'n1',
        data: { name: 'C2 Server', bogus_field: 'dropped', description: 'C2' } as Record<string, string>,
      },
      { op: 'connect', source: 'n1', target: 'new1', label: 'Communicates with' },
    ]);

    expect(result.changed).toBe(true);
    expect(result.results.every(r => r.status === 'applied')).toBe(true);
    expect(result.nodes).toHaveLength(2);

    const added = result.nodes[1];
    expect(added.type).toBe('infrastructure');
    expect(added.data.name).toBe('C2 Server');
    expect(added.data).not.toHaveProperty('bogus_field');
    // Real id minted locally, not the model's ref
    expect(added.id).not.toBe('new1');

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].source).toBe('n1');
    expect(result.edges[0].target).toBe(added.id);
    expect(result.edges[0].label).toBe('Communicates with');
    expect(result.edges[0].type).toBe('floating');
  });

  it('places a node near its anchor and staggers siblings', () => {
    const anchor = { ...node('n1'), position: { x: 100, y: 50 } };
    const result = apply([anchor], [], [
      { op: 'add_node', ref: 'a', nodeType: 'tool', near: 'n1' },
      { op: 'add_node', ref: 'b', nodeType: 'tool', near: 'n1' },
    ]);
    const [, first, second] = result.nodes;
    // Offsets are the layout's own box plus its sibling gap (270+60, 150+60)
    expect(first.position).toEqual({ x: 430, y: 50 });
    expect(second.position).toEqual({ x: 430, y: 260 });
  });

  it('grows unanchored nodes from the supplied origin', () => {
    // Far from the graph, as it is whenever the user has panned elsewhere
    const result = apply([node('n1')], [], [
      { op: 'add_node', ref: 'a', nodeType: 'tool' },
      { op: 'add_node', ref: 'b', nodeType: 'tool' },
    ], { origin: { x: 2000, y: 900 } });

    const [, first, second] = result.nodes;
    expect(first.position).toEqual({ x: 2000, y: 900 });
    expect(second.position).toEqual({ x: 2000, y: 1110 });
  });

  it('steps an unanchored node aside from whatever is already at the origin', () => {
    // Origin sits directly on n1, which is what happens when the assistant adds
    // a node while the user is looking straight at an existing one.
    const result = apply([node('n1')], [], [
      { op: 'add_node', ref: 'a', nodeType: 'tool' },
    ], { origin: { x: 0, y: 0 } });

    expect(result.nodes[1].position).toEqual({ x: 330, y: 0 });
  });

  it('falls back to the graph bounds when no origin is given', () => {
    const result = apply([{ ...node('n1'), position: { x: 100, y: 50 } }], [], [
      { op: 'add_node', ref: 'a', nodeType: 'tool' },
    ]);

    // Right of n1's box (270 wide, centred at 100) plus the standard offset
    expect(result.nodes[1].position).toEqual({ x: 565, y: -25 });
  });

  it('reports the nodes it added so the caller can frame them', () => {
    const result = apply([node('n1')], [], [
      { op: 'add_node', ref: 'a', nodeType: 'tool' },
      { op: 'update_node', id: 'n1', data: { name: 'Renamed' } },
    ], { origin: { x: 500, y: 500 } });

    expect(result.addedNodeIds).toEqual([result.nodes[1].id]);
  });

  it('skips invalid ops but applies the rest', () => {
    const result = apply([node('n1'), node('n2')], [edge('e1', 'n1', 'n2')], [
      { op: 'connect', source: 'n1', target: 'ghost' },       // unknown node
      { op: 'connect', source: 'n1', target: 'n1' },          // self-loop
      { op: 'connect', source: 'n1', target: 'n2' },          // duplicate
      { op: 'add_node', ref: 'x', nodeType: 'bad' as never }, // unknown type
      { op: 'update_node', id: 'n2', data: { name: 'Renamed' } },
    ]);

    const statuses = result.results.map(r => r.status);
    expect(statuses).toEqual(['skipped', 'skipped', 'skipped', 'skipped', 'applied']);
    expect(result.changed).toBe(true);
    expect(result.nodes.find(n => n.id === 'n2')?.data.name).toBe('Renamed');
    expect(result.edges).toHaveLength(1);
  });

  it('re-types a node through update_node and keeps invalid type patches out', () => {
    const result = apply([node('n1', 'Thing', 'tool')], [], [
      { op: 'update_node', id: 'n1', data: { type: 'malware', name: 'Evil' } },
      { op: 'update_node', id: 'n1', data: { type: 'not-a-type' } },
    ]);
    expect(result.results[0].status).toBe('applied');
    expect(result.results[1].status).toBe('skipped');
    expect(result.nodes[0].type).toBe('malware');
    expect(result.nodes[0].data.type).toBe('malware');
    expect(result.nodes[0].data.name).toBe('Evil');
  });

  it('cascades node deletion to attached edges', () => {
    const result = apply(
      [node('n1'), node('n2'), node('n3')],
      [edge('e1', 'n1', 'n2'), edge('e2', 'n2', 'n3')],
      [{ op: 'delete_node', id: 'n2' }],
    );
    expect(result.nodes.map(n => n.id)).toEqual(['n1', 'n3']);
    expect(result.edges).toHaveLength(0);
  });

  it('handles edge label, reverse, and delete ops', () => {
    const result = apply([node('n1'), node('n2')], [edge('e1', 'n1', 'n2')], [
      { op: 'update_edge_label', edgeId: 'e1', label: '  Uses  ' },
      { op: 'reverse_edge', edgeId: 'e1' },
      { op: 'delete_edge', edgeId: 'nope' },
    ]);
    expect(result.edges[0].label).toBe('Uses');
    expect(result.edges[0].source).toBe('n2');
    expect(result.edges[0].target).toBe('n1');
    expect(result.results[2].status).toBe('skipped');
  });

  it('relayouts and reports didRelayout', () => {
    const result = apply([node('n1'), node('n2')], [edge('e1', 'n1', 'n2')], [
      { op: 'relayout' },
    ]);
    expect(result.didRelayout).toBe(true);
    expect(result.changed).toBe(true);
  });

  it('reports changed=false when nothing applied and leaves inputs untouched', () => {
    const inputNodes = [node('n1')];
    const inputEdges: Edge[] = [];
    const result = apply(inputNodes, inputEdges, [
      { op: 'delete_node', id: 'ghost' },
    ]);
    expect(result.changed).toBe(false);
    expect(inputNodes).toHaveLength(1);
    expect(result.nodes).toHaveLength(1);
  });
});
