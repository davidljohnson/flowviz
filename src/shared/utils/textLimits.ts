/**
 * Shared input-size limits for analysis. Previously duplicated verbatim in
 * App.tsx (submit guard + toast) and SearchForm.tsx (counter, border colour,
 * chip, disabled state) — the two copies had to be kept in sync by hand.
 */
export const TEXT_LIMITS = {
  MAX_CHARS: 650000,
  WARNING_CHARS: 500000,
  MAX_WORDS: Math.floor(650000 / 5),
} as const;

export const getTextStats = (text: string) => {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isNearLimit = chars > TEXT_LIMITS.WARNING_CHARS;
  const isOverLimit = chars > TEXT_LIMITS.MAX_CHARS;
  return { chars, words, isNearLimit, isOverLimit };
};
