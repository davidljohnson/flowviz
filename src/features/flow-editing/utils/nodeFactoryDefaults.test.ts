import { describe, it, expect } from 'vitest';
import { STIXBundleExporter } from '../../flow-export/services/stixBundleExporter';
import { AttackFlowV3Exporter } from '../../flow-export/services/attackFlowV3Exporter';
import { createFlowNode, createDefaultNodeData, EditorNodeType, NODE_TYPE_LABELS } from './nodeFactoryDefaults';

const ALL_TYPES = Object.keys(NODE_TYPE_LABELS) as EditorNodeType[];

describe('createFlowNode', () => {
  it('mints unique ids and mirrors id/type into data', () => {
    const a = createFlowNode('action', { x: 10, y: 20 });
    const b = createFlowNode('action', { x: 10, y: 20 });

    expect(a.id).not.toBe(b.id);
    expect(a.data.id).toBe(a.id);
    expect(a.data.type).toBe('action');
    expect(a.type).toBe('action');
    expect(a.position).toEqual({ x: 10, y: 20 });
  });

  it('gives every type a default name', () => {
    for (const type of ALL_TYPES) {
      const data = createDefaultNodeData(type);
      expect(data.name, `name for ${type}`).toBeTruthy();
    }
  });

  it('operators carry the operator field', () => {
    expect(createDefaultNodeData('AND_operator').operator).toBe('AND');
    expect(createDefaultNodeData('OR_operator').operator).toBe('OR');
  });
});

describe('export round-trips for manually created nodes', () => {
  it('every node type survives STIX export (none silently dropped)', () => {
    // The STIX exporter drops nodes whose data.type it does not recognize -
    // this guards the factory's type strings against that
    const nodes = ALL_TYPES.map(type => createFlowNode(type, { x: 0, y: 0 }));

    // Operators export as groupings, whose object_refs may not be empty, so an
    // operator with nothing wired into it is dropped by design. Give each one
    // an input so this test still measures type-string coverage and not that.
    const anchor = createFlowNode('action', { x: 0, y: 0 });
    const edges = nodes
      .filter(n => n.type?.endsWith('_operator'))
      .map((n, i) => ({ id: `feed-${i}`, source: anchor.id, target: n.id }));

    const bundle = new STIXBundleExporter().exportToSTIXBundle([...nodes, anchor], edges);
    const exportedTypes = new Set(
      bundle.objects!.filter(o => o.type !== 'relationship').map(o => o.type)
    );

    for (const node of nodes) {
      expect(
        bundle.objects!.some(o => o.name === node.data.name),
        `${node.type} was dropped from the STIX export`
      ).toBe(true);
    }
    expect(exportedTypes.size).toBeGreaterThan(0);
  });

  it('edges between manual nodes export as STIX relationships', () => {
    const source = createFlowNode('action', { x: 0, y: 0 });
    const target = createFlowNode('asset', { x: 0, y: 100 });
    const edge = { id: 'e1', source: source.id, target: target.id, label: 'targets' };

    const bundle = new STIXBundleExporter().exportToSTIXBundle([source, target], [edge]);
    const relationship = bundle.objects.find((o: any) => o.type === 'relationship');
    expect(relationship).toBeDefined();
    // find() is typed as possibly-undefined; the assertion above is the guard.
    expect(relationship!.relationship_type).toBe('targets');
  });

  it('every node type survives Attack Flow (AFB) export with valid layout', () => {
    const nodes = ALL_TYPES.map((type, i) => createFlowNode(type, { x: i * 100, y: 50 }));
    const edges = [{
      id: 'e1',
      source: nodes[0].id,
      target: nodes[1].id,
    }];

    const afb = new AttackFlowV3Exporter().exportToAttackFlowV3(nodes, edges);
    const serialized = JSON.stringify(afb);
    expect(serialized).not.toContain('NaN');
    // One AFB object per node plus line objects for the edge
    expect(afb.objects.length).toBeGreaterThanOrEqual(ALL_TYPES.length);
  });
});
