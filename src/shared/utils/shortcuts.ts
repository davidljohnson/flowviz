/**
 * Keyboard shortcut labels.
 *
 * Every accelerator in the product is written once, here, so the tooltip, the
 * command palette hint and the handler that actually fires can't drift apart.
 * The handlers all test `event.ctrlKey || event.metaKey`, which means the same
 * binding already worked on both platforms — only the label was missing, and
 * the two places that showed one hardcoded "Ctrl+…" for Mac users too.
 */

/** True on Apple platforms, where the modifier renders as ⌘ rather than Ctrl. */
const isApple = (): boolean =>
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

/**
 * `'S'` → `'⌘S'` on Mac, `'Ctrl+S'` elsewhere.
 *
 * Mac convention runs the glyph straight into the key with no separator, which
 * is why this is a function rather than a prefix constant callers concatenate.
 */
export const shortcut = (key: string): string =>
  isApple() ? `⌘${key}` : `Ctrl+${key}`;

/** As `shortcut`, in the parenthesised form the tooltips use. */
export const shortcutHint = (key: string): string => `(${shortcut(key)})`;
