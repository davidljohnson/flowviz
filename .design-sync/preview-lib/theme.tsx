import type { ReactNode } from 'react';
import { themeCssVars } from 'flowviz';

/**
 * Shared framing for the authored preview cards.
 *
 * Two things need handling that the card harness doesn't do for us:
 *
 * 1. **Mode.** `ThemeModeProvider` resolves its mode from localStorage, then
 *    `prefers-color-scheme`. Headless Chromium reports light, so cards would
 *    render in the light palette — not what FlowViz looks like in use. Seeding
 *    the storage key below pins every card to the app's own default instead.
 *
 * 2. **Per-cell mode.** Every cell on a card mounts its own provider but they
 *    all share one `<html data-theme>`, so a card showing dark beside light
 *    can't switch by attribute. `themeCssVars(mode)` writes the whole `--fv-*`
 *    set onto the cell's own subtree, which the components resolve through
 *    normally. Both modes are written explicitly so a cell never depends on
 *    which provider happened to mount last.
 */
try {
  localStorage.setItem('theme_mode', 'dark');
} catch {
  // Storage disabled — the provider's own dark fallback still applies.
}

export type Mode = 'dark' | 'light';

/**
 * A patch of the app's own page surface, in `mode`. Components are built to sit
 * on it — previewing them against the card's bare white would misrepresent
 * every translucent surface in the system.
 */
export const Surface = ({
  children,
  mode = 'dark',
  width,
  pad = 20,
}: {
  children: ReactNode;
  mode?: Mode;
  width?: number | string;
  pad?: number;
}) => (
  <div
    style={{
      ...(themeCssVars(mode) as Record<string, string>),
      background: 'var(--fv-background-primary)',
      color: 'var(--fv-text-primary)',
      padding: pad,
      borderRadius: 12,
      width,
      boxSizing: 'border-box',
      // Hug the content: as a block it stretches to the capture viewport and
      // the card becomes mostly empty backdrop.
      display: 'inline-block',
    }}
  >
    {children}
  </div>
);

/** Dark and light of the same content, stacked — for palette-sensitive parts. */
export const BothModes = ({ children, width }: { children: ReactNode; width?: number | string }) => (
  <div style={{ display: 'grid', gap: 12 }}>
    <Surface mode="dark" width={width}>
      {children}
    </Surface>
    <Surface mode="light" width={width}>
      {children}
    </Surface>
  </div>
);
