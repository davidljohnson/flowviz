/**
 * Tidy extracted article text for display. Readability output rendered via
 * textContent keeps the markup's newlines and indentation, so paragraph
 * boundaries arrive as runs of blank lines that pre-wrap renders as large
 * gaps. Lines are trimmed and gaps collapsed to a single blank line. Must be
 * applied to the SAME text the excerpt highlighter searches, so match
 * indices line up with what is on screen.
 */
export function normalizeSourceText(text: string): string {
  return text
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Locate a node's source_excerpt inside the original article text.
 *
 * The excerpt is model-authored, so it rarely matches byte-for-byte: quoting
 * collapses whitespace, changes case, or drops a trailing ellipsis. Exact
 * match is tried first, then a normalized search (case-insensitive, all
 * whitespace runs collapsed to one space) with an index map back into the
 * original text so the highlight lands on the real characters.
 */
export function findExcerptRange(
  text: string,
  excerpt: string,
): { start: number; end: number } | null {
  if (!text || !excerpt) return null;
  // Model excerpts often end in "..." that isn't in the article
  const trimmed = excerpt.trim().replace(/(\.{3}|…)$/, '').trim();
  if (trimmed.length < 8) return null; // too short to be a meaningful match

  const exact = text.indexOf(trimmed);
  if (exact !== -1) return { start: exact, end: exact + trimmed.length };

  // Normalized pass: build the collapsed string and a map back to original
  // indices, one entry per normalized character
  const map: number[] = [];
  let normalized = '';
  let prevWasSpace = true;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (/\s/.test(char)) {
      if (prevWasSpace) continue;
      normalized += ' ';
      map.push(i);
      prevWasSpace = true;
    } else {
      normalized += char.toLowerCase();
      map.push(i);
      prevWasSpace = false;
    }
  }

  const normalizedExcerpt = trimmed.toLowerCase().replace(/\s+/g, ' ');
  const index = normalized.indexOf(normalizedExcerpt);
  if (index === -1) return null;

  return {
    start: map[index],
    end: map[index + normalizedExcerpt.length - 1] + 1,
  };
}
