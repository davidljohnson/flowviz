/**
 * Minimal markdown parser for assistant replies. Deliberately tiny rather
 * than a dependency: the prompt only licenses bold, italic, inline code,
 * headings, lists, and [[id|label]] node references, so that is all this
 * understands. Parsing is pure so it can be unit-tested without React.
 */

export type InlineToken =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'noderef'; id: string; label: string };

export type MarkdownBlock =
  | { kind: 'heading'; level: number; inline: InlineToken[] }
  | { kind: 'paragraph'; inline: InlineToken[] }
  | { kind: 'list'; ordered: boolean; items: InlineToken[][] }
  | { kind: 'codeblock'; lang: string; text: string };

// Order matters: node refs and code first so their contents aren't re-parsed
const INLINE_PATTERN = /\[\[([^\]|]+)\|([^\]]+)\]\]|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;

export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) tokens.push({ kind: 'text', text: text.slice(last, index) });
    const [, refId, refLabel, code, bold, italic] = match;
    if (refId !== undefined) tokens.push({ kind: 'noderef', id: refId, label: refLabel });
    else if (code !== undefined) tokens.push({ kind: 'code', text: code });
    else if (bold !== undefined) tokens.push({ kind: 'bold', text: bold });
    else tokens.push({ kind: 'italic', text: italic });
    last = index + match[0].length;
  }
  if (last < text.length) tokens.push({ kind: 'text', text: text.slice(last) });
  return tokens;
}

const HEADING = /^(#{1,4})\s+(.*)$/;
const BULLET = /^\s*[-*]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const FENCE = /^```(\w*)\s*$/;

export function parseMarkdown(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let code: { lang: string; lines: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: 'paragraph', inline: parseInline(paragraph.join('\n')) });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ kind: 'list', ordered: list.ordered, items: list.items.map(parseInline) });
      list = null;
    }
  };

  for (const line of text.split('\n')) {
    if (code) {
      if (FENCE.test(line)) {
        blocks.push({ kind: 'codeblock', lang: code.lang, text: code.lines.join('\n') });
        code = null;
      } else {
        code.lines.push(line);
      }
      continue;
    }
    const fence = line.match(FENCE);
    if (fence) {
      flushParagraph();
      flushList();
      code = { lang: fence[1] ?? '', lines: [] };
      continue;
    }
    const heading = line.match(HEADING);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ kind: 'heading', level: heading[1].length, inline: parseInline(heading[2]) });
      continue;
    }
    const bullet = line.match(BULLET);
    const ordered = bullet ? null : line.match(ORDERED);
    if (bullet || ordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, items: [] };
      }
      list.items.push((bullet ?? ordered)![1]);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  // Unterminated fence: emit what has arrived, so a code block renders as it
  // streams instead of appearing only once its closing fence lands
  if (code) blocks.push({ kind: 'codeblock', lang: code.lang, text: code.lines.join('\n') });
  return blocks;
}

/**
 * Trim a half-received inline token off the end of streaming text so the
 * live bubble doesn't flash raw "[[abc" or "**Cred" while it arrives.
 * Bold and code marks are stripped by parity, not blindly from the end -
 * text ending exactly at a CLOSING mark is complete and must stay paired.
 * Inside an unterminated ``` fence nothing is trimmed: the parser renders
 * the open block as it streams, and its content is not inline markup.
 */
export function trimStreamingTail(text: string): string {
  const insideFence = ((text.match(/^```/gm) ?? []).length) % 2 === 1;
  if (insideFence) return text;

  let out = text.replace(/\[\[[^\]]*$/, '');
  if (((out.match(/\*\*/g) ?? []).length) % 2 === 1) {
    out = out.slice(0, out.lastIndexOf('**'));
  }
  // Count inline backticks only - fence marks are triple and come in pairs
  // of lines, so strip them before the parity check
  const inline = out.replace(/^```\w*\s*$/gm, '');
  if (((inline.match(/`/g) ?? []).length) % 2 === 1) {
    out = out.slice(0, out.lastIndexOf('`'));
  }
  return out;
}
