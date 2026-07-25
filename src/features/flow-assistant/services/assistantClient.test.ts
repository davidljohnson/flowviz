import { describe, it, expect } from 'vitest';
import { extractCompleteOps, extractPartialMessage } from './assistantClient';

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
