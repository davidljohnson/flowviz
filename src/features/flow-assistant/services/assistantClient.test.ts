import { describe, it, expect, vi, afterEach } from 'vitest';
import { extractCompleteOps, extractPartialMessage, streamAssistant } from './assistantClient';

describe('extractPartialMessage', () => {
  it('returns null before the message key opens', () => {
    expect(extractPartialMessage('')).toBeNull();
    expect(extractPartialMessage('```json\n{')).toBeNull();
    expect(extractPartialMessage('{"message"')).toBeNull();
    expect(extractPartialMessage('{"message": ')).toBeNull();
  });

  it('returns the partial content of an unterminated string', () => {
    expect(extractPartialMessage('{"message": "Hello wo')).toBe('Hello wo');
  });

  it('stops at the closing quote and ignores what follows', () => {
    expect(extractPartialMessage('{"message": "Done.", "ops": [{"op": "relayout"}]}')).toBe('Done.');
  });

  it('decodes escapes, including ones split mid-stream', () => {
    expect(extractPartialMessage('{"message": "line1\\nline2 \\"quoted\\""')).toBe('line1\nline2 "quoted"');
    // Trailing lone backslash is held back until its partner arrives
    expect(extractPartialMessage('{"message": "abc\\')).toBe('abc');
    // Incomplete unicode escape held back too
    expect(extractPartialMessage('{"message": "abc\\u00')).toBe('abc');
    expect(extractPartialMessage('{"message": "abc\\u00e9def')).toBe('abcédef');
  });

  it('works inside a fenced block', () => {
    expect(extractPartialMessage('```json\n{\n  "message": "Added a node')).toBe('Added a node');
  });
});

describe('extractCompleteOps', () => {
  it('returns nothing before the ops array opens', () => {
    expect(extractCompleteOps('{"message": "hi"')).toEqual([]);
    expect(extractCompleteOps('{"ops": ')).toEqual([]);
  });

  it('yields only the complete objects from a partial array', () => {
    const raw = '{"message": "ok", "ops": [{"op": "relayout"}, {"op": "add_node", "ref": "n1", "data": {"name": "C2"}}, {"op": "conn';
    const ops = extractCompleteOps(raw);
    expect(ops).toEqual([
      { op: 'relayout' },
      { op: 'add_node', ref: 'n1', data: { name: 'C2' } },
    ]);
  });

  it('ignores braces and brackets inside strings', () => {
    const raw = '{"ops": [{"op": "update_node", "id": "a", "data": {"description": "uses {curly} and ] tricks \\" quoted"}}, {"op":';
    expect(extractCompleteOps(raw)).toEqual([
      { op: 'update_node', id: 'a', data: { description: 'uses {curly} and ] tricks " quoted' } },
    ]);
  });

  it('stops at the array close and matches the final parse', () => {
    const raw = '{"ops": [{"op": "relayout"}], "message": "done {not an op}"}';
    expect(extractCompleteOps(raw)).toEqual([{ op: 'relayout' }]);
  });
});

describe('stopping a turn part-way', () => {
  /**
   * A body that hands over one chunk and then blocks, the way a real stream
   * waits on the model. The pending read is what the abort has to interrupt.
   */
  const stubStream = (firstChunk: string) => {
    vi.stubGlobal('fetch', (_url: string, init: RequestInit = {}) => Promise.resolve({
      ok: true,
      body: {
        getReader() {
          let sent = false;
          return {
            read: () => {
              if (!sent) {
                sent = true;
                return Promise.resolve({ done: false, value: new TextEncoder().encode(firstChunk) });
              }
              // Never resolves on its own - only the abort ends it. The
              // already-aborted check matters: a listener added to a signal
              // that has fired never runs, and the read would hang forever.
              return new Promise((_resolve, reject) => {
                const fail = () => reject(new DOMException('Aborted', 'AbortError'));
                if (init.signal?.aborted) return fail();
                init.signal?.addEventListener('abort', fail);
              });
            },
          };
        },
      },
    }));
  };

  const REQUEST = { messages: [{ role: 'user' as const, content: 'hi' }], graph: { nodes: [], edges: [] } };
  const sse = (text: string) =>
    'data: ' + JSON.stringify({ delta: { text } }) + String.fromCharCode(10);

  afterEach(() => vi.unstubAllGlobals());

  it('resolves with what arrived instead of throwing', async () => {
    stubStream(sse('{"message": "Adding the node'));
    const controller = new AbortController();
    const promise = streamAssistant(REQUEST, {}, controller.signal);
    await Promise.resolve();
    controller.abort();

    const result = await promise;
    expect(result.stopped).toBe(true);
    expect(result.message).toBe('Adding the node');
  });

  it('keeps the ops that completed before the stop, and no half ones', async () => {
    stubStream(sse('{"ops": [{"op": "relayout"}, {"op": "delete_node", "id": "n'));
    const seen: unknown[] = [];
    const controller = new AbortController();
    const promise = streamAssistant(REQUEST, { onOp: (op) => seen.push(op) }, controller.signal);
    await Promise.resolve();
    controller.abort();

    const result = await promise;
    expect(seen).toEqual([{ op: 'relayout' }]);
    expect(result.ops).toEqual([{ op: 'relayout' }]);
  });

  it('does not fall back to dumping raw JSON as the answer', async () => {
    // Without the stopped branch the half-object fails to parse and the
    // raw-text fallback prints braces and op JSON into the conversation.
    stubStream(sse('{"message": "Working", "ops": [{"op": "relay'));
    const controller = new AbortController();
    const promise = streamAssistant(REQUEST, {}, controller.signal);
    await Promise.resolve();
    controller.abort();

    const result = await promise;
    expect(result.message).toBe('Working');
    expect(result.message).not.toContain('{');
  });

  it('still throws when the read fails for a reason that is not a stop', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve({
      ok: true,
      body: { getReader: () => ({ read: () => Promise.reject(new Error('network died')) }) },
    }));
    await expect(streamAssistant(REQUEST, {}, new AbortController().signal))
      .rejects.toThrow('network died');
  });
});
