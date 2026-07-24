import { describe, it, expect } from 'vitest';
import { STIXBundleExporter } from './stixBundleExporter';
import { Node, Edge } from 'reactflow';

describe('STIXBundleExporter', () => {
  function makeNode(overrides: Partial<Node> & { id: string; type: string; data: any }): Node {
    return { position: { x: 0, y: 0 }, ...overrides } as Node;
  }

  function makeEdge(overrides: Partial<Edge> & { id: string; source: string; target: string }): Edge {
    return overrides as Edge;
  }

  // ── exportToSTIXBundle ────────────────────────────────────────────

  describe('exportToSTIXBundle()', () => {
    it('returns valid STIX 2.1 bundle structure', () => {
      const exporter = new STIXBundleExporter();
      const bundle = exporter.exportToSTIXBundle([], []);

      expect(bundle.type).toBe('bundle');
      expect(bundle.id).toMatch(/^bundle--/);
    });

    // A Bundle is a container, not an SDO. The 2.1 schema allows it type, id
    // and objects only, so anything else on it is a stray custom property.
    it('puts no SDO properties on the bundle itself', () => {
      const exporter = new STIXBundleExporter();
      const bundle = exporter.exportToSTIXBundle([], []) as Record<string, unknown>;

      expect(bundle.spec_version).toBeUndefined();
      expect(bundle.created).toBeUndefined();
      expect(bundle.modified).toBeUndefined();
    });

    // `objects` declares minItems:1, so an empty array is invalid where an
    // absent property is fine.
    it('omits objects entirely when there is nothing to export', () => {
      const exporter = new STIXBundleExporter();
      const bundle = exporter.exportToSTIXBundle([], []);

      expect(bundle.objects).toBeUndefined();
    });

    it('still marks each object with its own spec_version', () => {
      const exporter = new STIXBundleExporter();
      const nodes = [makeNode({ id: 't1', type: 'tool', data: { name: 'Cobalt Strike' } })];

      const bundle = exporter.exportToSTIXBundle(nodes, []);
      expect(bundle.objects![0].spec_version).toBe('2.1');
    });

    it('converts nodes to STIX objects', () => {
      const exporter = new STIXBundleExporter();
      const nodes = [
        makeNode({
          id: 'action-1',
          type: 'action',
          data: {
            name: 'Spearphishing',
            description: 'Sent phishing email',
            technique_id: 'T1566',
            tactic_name: 'Initial Access',
            source_excerpt: 'The attacker sent...',
            confidence: 'high'
          }
        }),
        makeNode({
          id: 'tool-1',
          type: 'tool',
          data: { name: 'Cobalt Strike', description: 'C2 framework' }
        })
      ];

      const bundle = exporter.exportToSTIXBundle(nodes, []);
      expect(bundle.objects).toHaveLength(2);
      expect(bundle.objects[0].type).toBe('attack-pattern');
      expect(bundle.objects[0].name).toBe('Spearphishing');
      expect(bundle.objects[1].type).toBe('tool');
      expect(bundle.objects[1].name).toBe('Cobalt Strike');
    });

    it('converts edges to STIX relationships', () => {
      const exporter = new STIXBundleExporter();
      const nodes = [
        makeNode({ id: 'action-1', type: 'action', data: { name: 'A', technique_id: 'T1190' } }),
        makeNode({ id: 'tool-1', type: 'tool', data: { name: 'B' } })
      ];
      const edges = [
        makeEdge({ id: 'e1', source: 'action-1', target: 'tool-1', label: 'Uses' })
      ];

      const bundle = exporter.exportToSTIXBundle(nodes, edges);
      // 2 nodes + 1 relationship
      expect(bundle.objects).toHaveLength(3);

      const rel = bundle.objects[2];
      expect(rel.type).toBe('relationship');
      expect(rel.relationship_type).toBe('uses');
      expect(rel.description).toBe('Uses');
    });

    it('skips edges with missing source or target nodes', () => {
      const exporter = new STIXBundleExporter();
      const nodes = [
        makeNode({ id: 'action-1', type: 'action', data: { name: 'A', technique_id: 'T1190' } })
      ];
      const edges = [
        makeEdge({ id: 'e1', source: 'action-1', target: 'missing-node', label: 'Uses' })
      ];

      const bundle = exporter.exportToSTIXBundle(nodes, edges);
      // Only the node, no relationship
      expect(bundle.objects).toHaveLength(1);
    });

    it('skips unknown node types', () => {
      const exporter = new STIXBundleExporter();
      const nodes = [
        makeNode({ id: 'x-1', type: 'unknown_type', data: { name: 'Mystery' } })
      ];

      const bundle = exporter.exportToSTIXBundle(nodes, []);
      expect(bundle.objects).toBeUndefined();
    });
  });

  // ── Node type mappings ────────────────────────────────────────────

  describe('node type conversions', () => {
    const typeTests: Array<{ nodeType: string; stixType: string }> = [
      { nodeType: 'action', stixType: 'attack-pattern' },
      { nodeType: 'attack-action', stixType: 'attack-pattern' },
      { nodeType: 'tool', stixType: 'tool' },
      { nodeType: 'malware', stixType: 'malware' },
      { nodeType: 'infrastructure', stixType: 'infrastructure' },
      { nodeType: 'vulnerability', stixType: 'vulnerability' },
      { nodeType: 'asset', stixType: 'identity' },
      { nodeType: 'attack-asset', stixType: 'identity' },
      { nodeType: 'url', stixType: 'indicator' },
      { nodeType: 'AND_operator', stixType: 'grouping' },
      { nodeType: 'OR_operator', stixType: 'grouping' },
    ];

    typeTests.forEach(({ nodeType, stixType }) => {
      it(`maps "${nodeType}" to STIX type "${stixType}"`, () => {
        const exporter = new STIXBundleExporter();
        const data: any = { name: 'Test' };
        if (nodeType === 'action' || nodeType === 'attack-action') {
          data.technique_id = 'T1190';
        }

        const id = `${nodeType}-1`;
        const nodes = [makeNode({ id, type: nodeType, data })];
        const edges: Edge[] = [];

        // An operator needs something to group: object_refs may not be empty,
        // so an operator with no inputs is dropped rather than exported invalid.
        if (nodeType.endsWith('_operator')) {
          nodes.push(makeNode({ id: 'feeder', type: 'tool', data: { name: 'Feeder' } }));
          edges.push(makeEdge({ id: 'e1', source: 'feeder', target: id }));
        }

        const bundle = exporter.exportToSTIXBundle(nodes, edges);
        expect(bundle.objects!.find(o => o.type === stixType)).toBeDefined();
      });
    });

    it('points an operator grouping at the nodes feeding into it', () => {
      const exporter = new STIXBundleExporter();
      const nodes = [
        makeNode({ id: 'a', type: 'tool', data: { name: 'A' } }),
        makeNode({ id: 'b', type: 'tool', data: { name: 'B' } }),
        makeNode({ id: 'op', type: 'AND_operator', data: { operator: 'AND' } }),
        makeNode({ id: 'downstream', type: 'malware', data: { name: 'C' } })
      ];
      const edges = [
        makeEdge({ id: 'e1', source: 'a', target: 'op' }),
        makeEdge({ id: 'e2', source: 'b', target: 'op' }),
        makeEdge({ id: 'e3', source: 'op', target: 'downstream' })
      ];

      const bundle = exporter.exportToSTIXBundle(nodes, edges);
      const objects = bundle.objects!;
      const grouping = objects.find(o => o.type === 'grouping')!;
      const idOf = (name: string) => objects.find(o => o.name === name)!.id;

      expect(grouping.object_refs).toEqual([idOf('A'), idOf('B')]);
      expect(grouping.object_refs).not.toContain(idOf('C'));
    });

    it('drops an operator that has nothing to group', () => {
      const exporter = new STIXBundleExporter();
      const nodes = [makeNode({ id: 'op', type: 'OR_operator', data: { operator: 'OR' } })];

      const bundle = exporter.exportToSTIXBundle(nodes, []);
      expect(bundle.objects).toBeUndefined();
    });
  });

  // ── MITRE references ──────────────────────────────────────────────

  describe('MITRE ATT&CK references', () => {
    it('creates technique URL reference', () => {
      const exporter = new STIXBundleExporter();
      const nodes = [
        makeNode({
          id: 'a1',
          type: 'action',
          data: {
            name: 'Exploit',
            technique_id: 'T1190',
            tactic_name: 'Initial Access'
          }
        })
      ];

      const bundle = exporter.exportToSTIXBundle(nodes, []);
      const refs = bundle.objects[0].external_references;
      expect(refs).toContainEqual({
        source_name: 'mitre-attack',
        external_id: 'T1190',
        url: 'https://attack.mitre.org/techniques/T1190'
      });
    });

    it('handles sub-technique IDs (T1059.001 → T1059/001)', () => {
      const exporter = new STIXBundleExporter();
      const nodes = [
        makeNode({
          id: 'a1',
          type: 'action',
          data: {
            name: 'PowerShell',
            technique_id: 'T1059.001',
            tactic_name: 'Execution'
          }
        })
      ];

      const bundle = exporter.exportToSTIXBundle(nodes, []);
      const refs = bundle.objects[0].external_references;
      expect(refs[0].url).toBe('https://attack.mitre.org/techniques/T1059/001');
    });

    it('creates empty references when no technique_id', () => {
      const exporter = new STIXBundleExporter();
      const nodes = [
        makeNode({
          id: 'a1',
          type: 'action',
          data: { name: 'Unknown', tactic_name: 'Execution' }
        })
      ];

      const bundle = exporter.exportToSTIXBundle(nodes, []);
      expect(bundle.objects[0].external_references).toEqual([]);
    });
  });

  // ── Edge label to relationship mapping ────────────────────────────

  describe('edge label mapping', () => {
    function getRelType(label: string): string {
      const exporter = new STIXBundleExporter();
      const nodes = [
        makeNode({ id: 'a', type: 'tool', data: { name: 'A' } }),
        makeNode({ id: 'b', type: 'tool', data: { name: 'B' } })
      ];
      const edges = [makeEdge({ id: 'e1', source: 'a', target: 'b', label })];
      const bundle = exporter.exportToSTIXBundle(nodes, edges);
      const rel = bundle.objects.find((o: any) => o.type === 'relationship');
      return rel?.relationship_type;
    }

    it('maps "Uses" → "uses"', () => expect(getRelType('Uses')).toBe('uses'));
    it('maps "Targets" → "targets"', () => expect(getRelType('Targets')).toBe('targets'));
    it('maps "Communicates with" → "communicates-with"', () =>
      expect(getRelType('Communicates with')).toBe('communicates-with'));
    it('maps "Exploits" → "exploits"', () => expect(getRelType('Exploits')).toBe('exploits'));
    it('maps "Downloads" → "downloads"', () => expect(getRelType('Downloads')).toBe('downloads'));
    it('maps "Leads to" → "related-to"', () => expect(getRelType('Leads to')).toBe('related-to'));
    it('maps "Affects" → "related-to"', () => expect(getRelType('Affects')).toBe('related-to'));
    it('maps unknown label to "related-to"', () =>
      expect(getRelType('some random label')).toBe('related-to'));
  });

  // ── STIX pattern generation ───────────────────────────────────────

  describe('indicator patterns', () => {
    it('creates URL pattern for url nodes', () => {
      const exporter = new STIXBundleExporter();
      const nodes = [
        makeNode({
          id: 'url-1',
          type: 'url',
          data: { name: 'https://evil.com/payload', value: 'https://evil.com/payload' }
        })
      ];

      const bundle = exporter.exportToSTIXBundle(nodes, []);
      expect(bundle.objects[0].pattern).toBe("[url:value = 'https://evil.com/payload']");
      expect(bundle.objects[0].pattern_type).toBe('stix');
    });

    it('uses name as fallback when value is not set', () => {
      const exporter = new STIXBundleExporter();
      const nodes = [
        makeNode({
          id: 'url-1',
          type: 'url',
          data: { name: 'https://example.com' }
        })
      ];

      const bundle = exporter.exportToSTIXBundle(nodes, []);
      expect(bundle.objects[0].pattern).toBe("[url:value = 'https://example.com']");
    });
  });

  // ── Vulnerability nodes ───────────────────────────────────────────

  describe('vulnerability nodes', () => {
    it('creates CVE external reference', () => {
      const exporter = new STIXBundleExporter();
      const nodes = [
        makeNode({
          id: 'v1',
          type: 'vulnerability',
          data: { name: 'Log4Shell', cve_id: 'CVE-2021-44228' }
        })
      ];

      const bundle = exporter.exportToSTIXBundle(nodes, []);
      const vuln = bundle.objects[0];
      expect(vuln.external_references[0].external_id).toBe('CVE-2021-44228');
      expect(vuln.external_references[0].source_name).toBe('cve');
    });

    it('uses cve_id as name fallback', () => {
      const exporter = new STIXBundleExporter();
      const nodes = [
        makeNode({
          id: 'v1',
          type: 'vulnerability',
          data: { cve_id: 'CVE-2024-0001' }
        })
      ];

      const bundle = exporter.exportToSTIXBundle(nodes, []);
      expect(bundle.objects[0].name).toBe('CVE-2024-0001');
    });
  });
});
