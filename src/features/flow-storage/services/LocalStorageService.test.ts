import { describe, it, expect } from 'vitest';
import { LocalStorageService } from './LocalStorageService';

// We only test the pure validateFlow() method — no localStorage mocking needed.

function makeValidFlow(overrides: Record<string, any> = {}) {
  return {
    id: 'flow-1',
    title: 'Test Flow',
    sourceUrl: 'https://example.com/article',
    inputMode: 'url',
    nodes: [{ id: 'n1', type: 'action', position: { x: 0, y: 0 }, data: { name: 'A' } }],
    edges: [{ id: 'e1', source: 'n1', target: 'n1' }],
    metadata: {
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      version: '1.0.0',
      tags: ['apt'],
      nodeCount: 1,
      edgeCount: 1,
    },
    visualization: {},
    analysis: {},
    ...overrides,
  };
}

describe('LocalStorageService.validateFlow()', () => {
  const service = new LocalStorageService();

  // ── Valid flows ───────────────────────────────────────────────────

  it('accepts a valid flow and returns it', () => {
    const result = service.validateFlow(makeValidFlow());
    expect(result).not.toBeNull();
    expect(result!.id).toBe('flow-1');
    expect(result!.title).toBe('Test Flow');
  });

  // ── Missing required fields ───────────────────────────────────────

  it('rejects flow missing id', () => {
    expect(service.validateFlow(makeValidFlow({ id: '' }))).toBeNull();
  });

  it('rejects flow missing title', () => {
    expect(service.validateFlow(makeValidFlow({ title: '' }))).toBeNull();
  });

  it('rejects flow missing nodes', () => {
    expect(service.validateFlow(makeValidFlow({ nodes: undefined }))).toBeNull();
  });

  it('rejects flow missing edges', () => {
    expect(service.validateFlow(makeValidFlow({ edges: undefined }))).toBeNull();
  });

  it('rejects flow missing metadata', () => {
    expect(service.validateFlow(makeValidFlow({ metadata: undefined }))).toBeNull();
  });

  it('rejects flow with non-array nodes', () => {
    expect(service.validateFlow(makeValidFlow({ nodes: 'not-an-array' }))).toBeNull();
  });

  it('rejects flow with non-array edges', () => {
    expect(service.validateFlow(makeValidFlow({ edges: {} }))).toBeNull();
  });

  // ── Missing metadata timestamps ──────────────────────────────────

  it('rejects flow missing metadata.createdAt', () => {
    const flow = makeValidFlow();
    delete flow.metadata.createdAt;
    expect(service.validateFlow(flow)).toBeNull();
  });

  it('rejects flow missing metadata.updatedAt', () => {
    const flow = makeValidFlow();
    delete flow.metadata.updatedAt;
    expect(service.validateFlow(flow)).toBeNull();
  });

  // ── Auto-normalization of defaults ────────────────────────────────

  it('defaults inputMode to "url" when missing', () => {
    const flow = makeValidFlow({ inputMode: undefined });
    const result = service.validateFlow(flow);
    expect(result!.inputMode).toBe('url');
  });

  it('defaults version to "1.0.0" when missing', () => {
    const flow = makeValidFlow();
    delete flow.metadata.version;
    const result = service.validateFlow(flow);
    expect(result!.metadata.version).toBe('1.0.0');
  });

  it('defaults tags to empty array when missing', () => {
    const flow = makeValidFlow();
    delete flow.metadata.tags;
    const result = service.validateFlow(flow);
    expect(result!.metadata.tags).toEqual([]);
  });

  it('defaults tags to empty array when not an array', () => {
    const flow = makeValidFlow();
    flow.metadata.tags = 'not-an-array' as any;
    const result = service.validateFlow(flow);
    expect(result!.metadata.tags).toEqual([]);
  });

  it('computes nodeCount from nodes array when missing', () => {
    const flow = makeValidFlow();
    delete flow.metadata.nodeCount;
    const result = service.validateFlow(flow);
    expect(result!.metadata.nodeCount).toBe(1);
  });

  it('computes edgeCount from edges array when missing', () => {
    const flow = makeValidFlow();
    delete flow.metadata.edgeCount;
    const result = service.validateFlow(flow);
    expect(result!.metadata.edgeCount).toBe(1);
  });

  it('defaults visualization to empty object when missing', () => {
    const flow = makeValidFlow({ visualization: undefined });
    const result = service.validateFlow(flow);
    expect(result!.visualization).toEqual({});
  });

  it('defaults analysis to empty object when missing', () => {
    const flow = makeValidFlow({ analysis: undefined });
    const result = service.validateFlow(flow);
    expect(result!.analysis).toEqual({});
  });

  // ── Edge cases ────────────────────────────────────────────────────

  it('returns null for null input', () => {
    expect(service.validateFlow(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(service.validateFlow(undefined)).toBeNull();
  });

  it('returns null for a string input', () => {
    expect(service.validateFlow('not-a-flow')).toBeNull();
  });

  it('returns null for a number input', () => {
    expect(service.validateFlow(42)).toBeNull();
  });

  it('accepts flow with empty nodes and edges arrays', () => {
    const flow = makeValidFlow({ nodes: [], edges: [] });
    flow.metadata.nodeCount = 0;
    flow.metadata.edgeCount = 0;
    const result = service.validateFlow(flow);
    expect(result).not.toBeNull();
    expect(result!.nodes).toEqual([]);
    expect(result!.edges).toEqual([]);
  });
});
