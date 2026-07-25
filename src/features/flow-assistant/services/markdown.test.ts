import { describe, it, expect } from 'vitest';
import { parseInline, parseMarkdown, trimStreamingTail } from './markdown';

describe('parseInline', () => {
  it('tokenizes bold, italic, code, and node refs around plain text', () => {
    expect(parseInline('Watch **T1555** via `reg.exe` on [[n1|the loader]] *quickly*')).toEqual([
      { kind: 'text', text: 'Watch ' },
      { kind: 'bold', text: 'T1555' },
      { kind: 'text', text: ' via ' },
      { kind: 'code', text: 'reg.exe' },
      { kind: 'text', text: ' on ' },
      { kind: 'noderef', id: 'n1', label: 'the loader' },
      { kind: 'text', text: ' ' },
      { kind: 'italic', text: 'quickly' },
    ]);
  });

  it('leaves unmatched markers as plain text', () => {
    expect(parseInline('a * b and 2*3=6')).toEqual([{ kind: 'text', text: 'a * b and 2*3=6' }]);
  });
});

describe('parseMarkdown', () => {
  it('splits headings, paragraphs, and lists', () => {
    const blocks = parseMarkdown('## Detections\n\nTwo rules:\n- rule one\n- rule two\n\n1. first\n2. second');
    expect(blocks.map(b => b.kind)).toEqual(['heading', 'paragraph', 'list', 'list']);
    expect(blocks[2]).toMatchObject({ ordered: false, items: [[{ kind: 'text', text: 'rule one' }], [{ kind: 'text', text: 'rule two' }]] });
    expect(blocks[3]).toMatchObject({ ordered: true });
  });

  it('keeps consecutive lines in one paragraph and blank lines as separators', () => {
    const blocks = parseMarkdown('line one\nline two\n\nsecond para');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ kind: 'paragraph', inline: [{ kind: 'text', text: 'line one\nline two' }] });
  });

  it('does not read *italic* at line start as a bullet', () => {
    const blocks = parseMarkdown('*emphasis* only');
    expect(blocks[0].kind).toBe('paragraph');
  });
});

describe('trimStreamingTail', () => {
  it('drops half-received tokens but keeps complete ones', () => {
    expect(trimStreamingTail('Done. See [[n1|loader]] and [[n2')).toBe('Done. See [[n1|loader]] and ');
    expect(trimStreamingTail('**bold** then **half')).toBe('**bold** then ');
    expect(trimStreamingTail('run `cmd` and `par')).toBe('run `cmd` and ');
    expect(trimStreamingTail('plain text')).toBe('plain text');
  });

  it('keeps a pair whose closing mark is the last thing received', () => {
    expect(trimStreamingTail('- **Lateral movement**')).toBe('- **Lateral movement**');
    expect(trimStreamingTail('run `whoami`')).toBe('run `whoami`');
  });

  it('leaves an open fenced block untouched while it streams', () => {
    const streaming = 'Here you go:\n```yaml\ntitle: Creds from stores\ndetection:\n  sel';
    expect(trimStreamingTail(streaming)).toBe(streaming);
  });

  it('does not let fence marks skew the inline backtick parity', () => {
    const closed = 'Rule:\n```yaml\ntitle: x\n```\nRun `sigmac` on it';
    expect(trimStreamingTail(closed)).toBe(closed);
  });
});

describe('parseMarkdown code blocks', () => {
  it('parses a fenced block with its language', () => {
    const blocks = parseMarkdown('Intro line\n```yaml\ntitle: Test\nlevel: high\n```\nAfter');
    expect(blocks.map(b => b.kind)).toEqual(['paragraph', 'codeblock', 'paragraph']);
    expect(blocks[1]).toEqual({ kind: 'codeblock', lang: 'yaml', text: 'title: Test\nlevel: high' });
  });

  it('emits an unterminated block with what has arrived', () => {
    const blocks = parseMarkdown('```yaml\ntitle: Partial');
    expect(blocks).toEqual([{ kind: 'codeblock', lang: 'yaml', text: 'title: Partial' }]);
  });

  it('does not parse markdown inside a fence', () => {
    const blocks = parseMarkdown('```\n- not a list\n**not bold**\n```');
    expect(blocks).toEqual([{ kind: 'codeblock', lang: '', text: '- not a list\n**not bold**' }]);
  });
});
