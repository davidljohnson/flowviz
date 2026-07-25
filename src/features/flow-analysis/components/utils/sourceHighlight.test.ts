import { describe, it, expect } from 'vitest';
import { findExcerptRange, normalizeSourceText } from './sourceHighlight';

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
