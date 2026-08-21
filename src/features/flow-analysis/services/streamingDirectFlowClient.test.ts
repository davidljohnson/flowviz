import { describe, it, expect, vi, afterEach } from 'vitest';
import { StreamingDirectFlowClient } from './streamingDirectFlowClient';

/** A fetch that streams the given SSE lines, then closes the body. */
function stubStream(lines: string[]) {
  const body = lines.map(l => `${l}\n`).join('');
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    body: {
      getReader() {
        let sent = false;
        return {
          read: async () => {
            if (sent) return { done: true, value: undefined };
            sent = true;
            return { done: false, value: new TextEncoder().encode(body) };
          },
        };
      },
    },
  }));
}

const delta = (text: string) =>
  `data: ${JSON.stringify({ type: 'content_block_delta', delta: { text } })}`;

const run = async (lines: string[]) => {
  stubStream(lines);
  const events: string[] = [];
  const nodes: string[] = [];
  await new StreamingDirectFlowClient().extractDirectFlowStreaming('https://example.com/report', {
    onNode: (n) => nodes.push(n.id),
    onEdge: () => {},
    onComplete: () => events.push('complete'),
    onError: (e) => events.push('error:' + e.message),
  });
  return { events, nodes };
};

const GOOD = '{"nodes":[{"id":"action-1","type":"action","data":{"name":"Phishing"}}],"edges":[]}';
// Cut off mid-object, the way a truncated response arrives.
const TRUNCATED = '{"nodes":[{"id":"action-1","type":"action","data":{"name":"Phis';

afterEach(() => vi.unstubAllGlobals());

describe('end of stream', () => {
  it('completes on a well-formed response', async () => {
    const { events, nodes } = await run([delta(GOOD), 'data: [DONE]']);
    expect(events).toEqual(['complete']);
    expect(nodes).toContain('action-1');
  });

  it('completes when the body closes without a [DONE] line', async () => {
    // This is the hang: nothing ran after the read loop broke, so the caller
    // was never told the run had ended and the loading indicator stayed up.
    const { events } = await run([delta(GOOD)]);
    expect(events).toEqual(['complete']);
  });

  it('reports an error when the response is malformed and nothing survived', async () => {
    const { events, nodes } = await run([delta(TRUNCATED), 'data: [DONE]']);
    expect(nodes).toHaveLength(0);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatch(/^error:/);
  });

  it('keeps whole nodes that streamed before the response was cut off', async () => {
    // The incremental parser already emitted this node; a later truncation
    // should not throw away a usable analysis.
    const { events, nodes } = await run([
      delta('{"nodes":[{"id":"action-1","type":"action","data":{"name":"Phishing"}},'),
      delta('{"id":"action-2","type":"action","data":{"name":"Trun'),
    ]);
    expect(nodes).toContain('action-1');
    expect(events).toEqual(['complete']);
  });

  it('does not complete when the server reported an error', async () => {
    const { events } = await run([
      'data: ' + JSON.stringify({ type: 'error', error: 'rate limited' }),
      'data: [DONE]',
    ]);
    expect(events).toEqual(['error:rate limited']);
  });
});
