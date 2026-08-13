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
 * Presentation the model adds around a quote it copied faithfully: emphasis
 * marks inside it, and quotation marks wrapped around the whole thing. Neither
 * is in the article, and neither changes whether the words are.
 *
 * Both were real false positives — `**or**` mid-sentence, and a correctly
 * copied passage the model helpfully put in quotes.
 */
const stripPresentation = (text: string): string =>
  text
    // Asterisks only. Underscores are markdown italics in prose but they are
    // also half the identifiers in a threat report — `wp_kses_post`,
    // `success_url`, `_envelope=1` — and stripping them turned three faithful
    // quotes into accusations. A missed `_italic_` costs nothing by comparison.
    .replace(/\*{1,2}/g, '')
    .replace(/^\s*["“”'‘’]+|["“”'‘’]+\s*$/g, '')
    .trim();

/** Splits a quote on an ellipsis used to weld two separate passages together. */
const ELLIPSIS = /\s*(?:\.{3}|…)\s*/;

/**
 * The passages a welded quote is made of, each cleaned the same way the whole
 * quote is. Shared by the checker and the highlighter so the badge and the
 * source panel can never disagree about what a quote is made of.
 */
const splitFragments = (clean: string): string[] =>
  clean.split(ELLIPSIS).map(stripPresentation).filter(fragment => fragment.length >= 8);

/**
 * Fold typographic punctuation to its ASCII twin.
 *
 * Publishers set curly quotes and en dashes; a model quoting them types the
 * plain ASCII. `Moody’s` and `Moody's` are the same word to every reader, and
 * were the difference between a verbatim quote and an accusation of inventing
 * one. Strictly one character in, one out, so the index map that findExcerptRange
 * builds alongside it still points at the right place in the original text.
 */
/**
 * Characters scraped HTML carries that nobody can see: soft hyphens left by
 * justified text, zero-width joiners, a stray BOM. They never survive into a
 * model's quote, so they can only ever cause a false miss. Dropped from both
 * sides — and dropped, not replaced, so the index map simply skips them.
 *
 * Listed as code points rather than a character class: written literally they
 * are invisible, so the line would read as an empty class in every editor and
 * every diff.
 */
const INVISIBLE_CODES = new Set([
  0x00ad, // soft hyphen
  0x200b, // zero-width space
  0x200c, // zero-width non-joiner
  0x200d, // zero-width joiner
  0xfeff, // byte-order mark
]);

const isInvisible = (char: string): boolean => INVISIBLE_CODES.has(char.charCodeAt(0));

const foldChar = (char: string): string => {
  switch (char) {
    case '‘': case '’': case '‛': return "'";
    case '“': case '”': case '‟': return '"';
    case '‐': case '‑': case '‒': case '–': case '—': case '−': return '-';
    default: return char;
  }
};

export type ExcerptVerdict = 'verified' | 'stitched' | 'unverified';

export interface ExcerptCheck {
  verdict: ExcerptVerdict;
  /** How many of the quote's passages were found in the source. */
  found: number;
  total: number;
}

/** A spliced piece has to be long enough that matching it isn't a coincidence. */
const MIN_SPLICE_PIECE = 25;

/**
 * Past this, a quote isn't spliced so much as reassembled, and the pieces are
 * short enough that finding them proves little.
 */
const MAX_SPLICE_PIECES = 4;

/** The longest prefix of `quote` that appears in the source, or 0 if none does. */
function longestGroundedPrefix(quote: string, foundIn: (s: string) => boolean): number {
  let low = MIN_SPLICE_PIECE;
  let high = quote.length;
  let best = 0;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (foundIn(quote.slice(0, mid))) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
}

/**
 * Break a quote into the runs the source actually contains, or null if any of
 * it is nowhere to be found.
 *
 * This is what catches a splice the author didn't punctuate. Telling the model
 * never to join passages "with ..." got it to stop writing the ellipsis and
 * carry on joining, so the tell disappeared while the behaviour stayed. Reading
 * the text itself rather than its punctuation is the only version of this check
 * that the wording of a prompt cannot dodge.
 */
function splicePieces(quote: string, foundIn: (s: string) => boolean): string[] | null {
  const pieces: string[] = [];
  let rest = quote;
  while (rest.length >= MIN_SPLICE_PIECE) {
    if (pieces.length >= MAX_SPLICE_PIECES) return null;
    const length = longestGroundedPrefix(rest, foundIn);
    if (length === 0) return null;
    pieces.push(rest.slice(0, length));
    // Whatever punctuation was holding the seam together is not evidence.
    rest = rest.slice(length).replace(/^[\s.,;:'"-]+/, '');
  }
  return pieces;
}

/**
 * Decide whether a node's `source_excerpt` is actually in the article.
 *
 * The prompt requires excerpts be copied verbatim, and calls them the thing
 * that "validates extraction accuracy" — but nothing checked, so a quote
 * stitched from two distant passages, or invented outright, read exactly like
 * a real one. This is a substring test, not a judgement: it needs no model and
 * cannot itself hallucinate.
 *
 * Three outcomes, because they mean different things. `stitched` is a quote
 * whose passages are each real but were joined together — sloppy, and worth a
 * look, but the evidence exists. `unverified` is a quote containing something
 * that is nowhere in the source, which is the one that matters.
 *
 * The join does not have to be punctuated. Told never to weld passages "with
 * ...", the model simply stopped writing the ellipsis, so a check that keyed on
 * it saw the splices stop while they were merely becoming invisible.
 *
 * Returns null when there is nothing to check against — a flow loaded without
 * its article, or a node with no excerpt. Absence of the source is not
 * evidence against the quote, and must not be shown as though it were.
 */
export function verifyExcerpt(
  sources: string | null | undefined | (string | null | undefined)[],
  excerpt: string | null | undefined,
): ExcerptCheck | null {
  // A flow's grounding is the article AND whatever the vision pass read out of
  // its images. Checking only the article would call every screenshot-derived
  // quote invented, which is the opposite of useful.
  const corpus = (Array.isArray(sources) ? sources : [sources]).filter(
    (s): s is string => typeof s === 'string' && s.length > 0,
  );
  const quote = (excerpt ?? '').trim();
  if (corpus.length === 0 || quote.length < 8) return null;

  const foundIn = (fragment: string) => corpus.some(source => findExcerptRange(source, fragment));

  const clean = stripPresentation(quote);
  if (foundIn(clean)) return { verdict: 'verified', found: 1, total: 1 };

  // Whole quote missing: work out whether it was assembled from real passages
  // or contains something that isn't there.
  //
  // An ellipsis, where the author marked the join, is the precise case and goes
  // first. Everything else falls through to reading the text itself, which is
  // what catches the joins nobody punctuated.
  const fragments = splitFragments(clean);
  if (fragments.length >= 2) {
    const found = fragments.filter(foundIn).length;
    return {
      verdict: found === fragments.length ? 'stitched' : 'unverified',
      found,
      total: fragments.length,
    };
  }

  const pieces = splicePieces(clean, foundIn);
  if (pieces && pieces.length >= 2) {
    return { verdict: 'stitched', found: pieces.length, total: pieces.length };
  }

  return { verdict: 'unverified', found: 0, total: 1 };
}

/**
 * Every span of the article a node's excerpt covers, in reading order.
 *
 * One range for an ordinary quote. For a welded one, a range per passage —
 * which is what makes the ellipsis visible: the panel highlights both halves
 * and leaves the elided text plain between them, so the reader sees exactly
 * what was skipped instead of a page with nothing marked on it.
 *
 * Empty when the quote isn't there at all. That is the same answer the badge
 * gives, because both run the excerpt through `stripPresentation` first — the
 * panel used to match on the raw string, so a quote the badge called verified
 * could still silently fail to highlight.
 */
export function findExcerptRanges(
  text: string,
  excerpt: string | null | undefined,
): Array<{ start: number; end: number }> {
  const quote = (excerpt ?? '').trim();
  if (!text || quote.length < 8) return [];

  const clean = stripPresentation(quote);
  const whole = findExcerptRange(text, clean);
  if (whole) return [whole];

  // Same order of resort as the checker, so the panel highlights every quote
  // the badge calls stitched — including the ones joined without an ellipsis.
  const inText = (fragment: string) => findExcerptRange(text, fragment) !== null;
  const fragments = splitFragments(clean);
  const parts = fragments.length >= 2 ? fragments : (splicePieces(clean, inText) ?? []);

  const found = parts
    .map(fragment => findExcerptRange(text, fragment))
    .filter((range): range is { start: number; end: number } => range !== null)
    .sort((a, b) => a.start - b.start);

  // Fragments can repeat a phrase that appears twice, landing two ranges on
  // top of each other; the renderer slices sequentially and would produce
  // negative-length text between them.
  return found.filter((range, i) => i === 0 || range.start >= found[i - 1].end);
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
    // Skipped outright, and never pushed to `map`, so the map stays aligned:
    // one entry per character that actually made it into `normalized`.
    if (isInvisible(char)) continue;
    if (/\s/.test(char)) {
      if (prevWasSpace) continue;
      normalized += ' ';
      map.push(i);
      prevWasSpace = true;
    } else {
      normalized += foldChar(char).toLowerCase();
      map.push(i);
      prevWasSpace = false;
    }
  }

  const normalizedExcerpt = Array.from(trimmed)
    .filter(char => !isInvisible(char))
    .map(foldChar)
    .join('')
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const index = normalized.indexOf(normalizedExcerpt);
  if (index === -1) return null;

  return {
    start: map[index],
    end: map[index + normalizedExcerpt.length - 1] + 1,
  };
}
