import { describe, it, expect } from 'vitest';
import { findExcerptRange, findExcerptRanges, normalizeSourceText, verifyExcerpt } from './sourceHighlight';

describe('normalizeSourceText', () => {
  it('collapses multi-blank-line gaps to one blank line', () => {
    expect(normalizeSourceText('Para one.\n\n\n\n\nPara two.')).toBe('Para one.\n\nPara two.');
  });

  it('strips per-line indentation left over from markup', () => {
    expect(normalizeSourceText('  Title\n    indented body\n\n\n  next  ')).toBe('Title\nindented body\n\nnext');
  });

  it('leaves already-tidy text alone', () => {
    expect(normalizeSourceText('One.\n\nTwo.')).toBe('One.\n\nTwo.');
  });
});

const ARTICLE = 'The attackers used  Cobalt Strike\nfor lateral movement.\nThey then deployed ransomware across the estate.';

describe('findExcerptRange', () => {
  it('finds an exact match', () => {
    const range = findExcerptRange(ARTICLE, 'deployed ransomware');
    expect(range).not.toBeNull();
    expect(ARTICLE.slice(range!.start, range!.end)).toBe('deployed ransomware');
  });

  it('matches across case and collapsed whitespace', () => {
    const range = findExcerptRange(ARTICLE, 'used cobalt strike for lateral movement');
    expect(range).not.toBeNull();
    expect(ARTICLE.slice(range!.start, range!.end)).toBe('used  Cobalt Strike\nfor lateral movement');
  });

  it('ignores a trailing ellipsis the model added', () => {
    expect(findExcerptRange(ARTICLE, 'deployed ransomware across...')).not.toBeNull();
    expect(findExcerptRange(ARTICLE, 'deployed ransomware across…')).not.toBeNull();
  });

  it('returns null for absent, empty, or too-short excerpts', () => {
    expect(findExcerptRange(ARTICLE, 'not in the article at all')).toBeNull();
    expect(findExcerptRange(ARTICLE, '')).toBeNull();
    expect(findExcerptRange(ARTICLE, 'used')).toBeNull();
    expect(findExcerptRange('', 'deployed ransomware')).toBeNull();
  });
});

describe('verifyExcerpt', () => {
  it('verifies a quote that is really in the article', () => {
    expect(verifyExcerpt(ARTICLE, 'deployed ransomware across the estate')).toEqual({
      verdict: 'verified', found: 1, total: 1,
    });
  });

  it('verifies through emphasis the model added to a real quote', () => {
    expect(verifyExcerpt(ARTICLE, 'deployed **ransomware** across the estate')?.verdict).toBe('verified');
  });

  it('calls a quote stitched when its fragments are real but welded together', () => {
    // Two genuine passages joined by an ellipsis - the shape that slipped
    // through before, since each half is quotable and the whole is not.
    expect(verifyExcerpt(ARTICLE, 'used Cobalt Strike for lateral movement ... deployed ransomware across the estate')).toEqual({
      verdict: 'stitched', found: 2, total: 2,
    });
  });

  it('flags a quote with a fragment that is nowhere in the article', () => {
    expect(verifyExcerpt(ARTICLE, 'deployed ransomware across the estate … exfiltrated 4TB to Mega')).toEqual({
      verdict: 'unverified', found: 1, total: 2,
    });
  });

  it('flags an invented quote', () => {
    expect(verifyExcerpt(ARTICLE, 'the operators dropped a signed rootkit')).toEqual({
      verdict: 'unverified', found: 0, total: 1,
    });
  });

  it('judges nothing when there is no article or no excerpt', () => {
    // Absence of the source is not evidence against the quote.
    expect(verifyExcerpt(null, 'deployed ransomware across the estate')).toBeNull();
    expect(verifyExcerpt('', 'deployed ransomware across the estate')).toBeNull();
    expect(verifyExcerpt(ARTICLE, '')).toBeNull();
    expect(verifyExcerpt(ARTICLE, 'short')).toBeNull();
  });
});

describe('verifyExcerpt across several grounding sources', () => {
  const VISION = 'The screenshot shows a "Sign in with Fueled" SSO button on the login page.';

  it('verifies a quote that is in the vision text rather than the article', () => {
    // Screenshot-derived nodes are grounded in the vision pass, not the prose.
    // Checking the article alone called these invented.
    expect(verifyExcerpt([ARTICLE, VISION], 'a "Sign in with Fueled" SSO button')?.verdict).toBe('verified');
  });

  it('still flags a quote in neither source', () => {
    expect(verifyExcerpt([ARTICLE, VISION], 'the operators dropped a signed rootkit')?.verdict).toBe('unverified');
  });

  it('judges nothing when every source is missing', () => {
    expect(verifyExcerpt([null, undefined], 'deployed ransomware across the estate')).toBeNull();
    expect(verifyExcerpt(null, 'deployed ransomware across the estate')).toBeNull();
  });
});

describe('verifyExcerpt ignores presentation the model wrapped around a real quote', () => {
  it('verifies a faithful quote the model put inside quotation marks', () => {
    expect(verifyExcerpt(ARTICLE, '"deployed ransomware across the estate"')?.verdict).toBe('verified');
    expect(verifyExcerpt(ARTICLE, '“deployed ransomware across the estate”')?.verdict).toBe('verified');
  });

  it('still reads a stitched quote whose fragments are individually quoted', () => {
    expect(verifyExcerpt(ARTICLE, '"used Cobalt Strike for lateral movement" … "deployed ransomware across the estate"')?.verdict).toBe('stitched');
  });
});

describe('typographic punctuation does not break a faithful quote', () => {
  // Publishers set curly punctuation; models quote it back as ASCII.
  const TYPESET = 'Reuters said Moody’s and the other firms — all of them — declined to comment.';

  it('matches an ASCII apostrophe against the article’s curly one', () => {
    expect(findExcerptRange(TYPESET, "Moody's and the other firms")).not.toBeNull();
    expect(verifyExcerpt(TYPESET, "said Moody's and the other firms")?.verdict).toBe('verified');
  });

  it('matches a plain hyphen against an em dash', () => {
    expect(verifyExcerpt(TYPESET, 'the other firms - all of them - declined')?.verdict).toBe('verified');
  });

  it('still highlights the real characters in the original text', () => {
    const range = findExcerptRange(TYPESET, "Moody's and the other firms");
    expect(TYPESET.slice(range!.start, range!.end)).toBe('Moody’s and the other firms');
  });
});

describe('invisible characters in scraped text do not break a quote', () => {
  const SOFT = String.fromCharCode(0x200b);
  const SCRAPED = 'Attackers used' + SOFT + ' Cobalt Strike for lateral movement.';

  it('matches through a zero-width space the publisher left behind', () => {
    expect(findExcerptRange(SCRAPED, 'used Cobalt Strike for lateral')).not.toBeNull();
    expect(verifyExcerpt(SCRAPED, 'Attackers used Cobalt Strike for lateral movement')?.verdict).toBe('verified');
  });
});

describe('snake_case identifiers survive the presentation strip', () => {
  const TECHY = 'WordPress passes the value through wp_kses_post(), then the _envelope=1 parameter wraps it.';

  it('does not treat underscores in identifiers as italics', () => {
    expect(verifyExcerpt(TECHY, 'passes the value through wp_kses_post()')?.verdict).toBe('verified');
    expect(verifyExcerpt(TECHY, 'the _envelope=1 parameter wraps it')?.verdict).toBe('verified');
  });

  it('still strips asterisk emphasis', () => {
    expect(verifyExcerpt(TECHY, 'through **wp_kses_post()**')?.verdict).toBe('verified');
  });
});

describe('findExcerptRanges', () => {
  const slice = (text: string, r: { start: number; end: number }) => text.slice(r.start, r.end);

  it('returns one span for an ordinary quote', () => {
    const ranges = findExcerptRanges(ARTICLE, 'deployed ransomware across the estate');
    expect(ranges).toHaveLength(1);
    expect(slice(ARTICLE, ranges[0])).toBe('deployed ransomware across the estate');
  });

  it('returns a span per passage for a welded quote, in reading order', () => {
    // What makes the ellipsis visible in the panel: both halves marked, the
    // elided text left plain between them.
    const ranges = findExcerptRanges(ARTICLE, 'used Cobalt Strike for lateral movement ... deployed ransomware across the estate');
    expect(ranges).toHaveLength(2);
    expect(ranges[0].end).toBeLessThanOrEqual(ranges[1].start);
    expect(slice(ARTICLE, ranges[0])).toContain('Cobalt Strike');
    expect(slice(ARTICLE, ranges[1])).toContain('ransomware');
  });

  it('agrees with the badge on a quote the model wrapped in quotation marks', () => {
    // The panel used to match the raw string, so this highlighted nothing
    // while the badge said verified.
    expect(verifyExcerpt(ARTICLE, '"deployed ransomware across the estate"')?.verdict).toBe('verified');
    expect(findExcerptRanges(ARTICLE, '"deployed ransomware across the estate"')).toHaveLength(1);
  });

  it('returns nothing for a quote that is not there', () => {
    expect(findExcerptRanges(ARTICLE, 'the operators dropped a signed rootkit')).toEqual([]);
    expect(findExcerptRanges(ARTICLE, '')).toEqual([]);
  });

  it('never returns overlapping spans', () => {
    // Both fragments resolve to the same passage; the renderer slices
    // sequentially and would produce negative-length text between them.
    const ranges = findExcerptRanges(ARTICLE, 'deployed ransomware across … ransomware across the estate');
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i].start).toBeGreaterThanOrEqual(ranges[i - 1].end);
    }
  });
});
