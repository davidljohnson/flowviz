import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CssBaseline, GlobalStyles, ThemeProvider } from '@mui/material';
import { createMuiTheme } from './muiTheme';
import { themeCssVars, type ThemeMode } from './flowviz-theme';

const STORAGE_KEY = 'theme_mode';

/**
 * The mode chosen before React mounts (see the inline bootstrap in index.html),
 * so the provider agrees with the paint that already happened rather than
 * flipping the whole UI on hydration.
 */
export const readStoredThemeMode = (): ThemeMode => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
  } catch {
    // Private mode / storage disabled — fall through to the default.
  }
  return 'dark';
};

interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export const useThemeMode = (): ThemeModeContextValue => {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used inside ThemeModeProvider');
  return ctx;
};

export default function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredThemeMode);

  // Every token below resolves through data-theme, so this attribute is the
  // single switch for the whole app.
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not being able to remember the choice shouldn't block making it.
    }
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* see above */
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, setMode, toggleMode }), [mode, setMode, toggleMode]);
  const muiTheme = useMemo(() => createMuiTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {/* Both palettes are emitted once and selected by attribute, so a
            switch costs one attribute write rather than a stylesheet rebuild. */}
        <GlobalStyles
          styles={{
            ':root, :root[data-theme="dark"]': themeCssVars('dark'),
            ':root[data-theme="light"]': themeCssVars('light'),

            /**
             * Keyboard focus, defined once.
             *
             * There was previously no focus indication anywhere: no
             * `:focus-visible` rule in the codebase, and `border.focus` only
             * ever reached MUI's `.Mui-focused` input border. So text fields
             * showed focus and nothing else did — not icon buttons, menu items,
             * segmented-control segments or dialog buttons, which is most of
             * the interactive surface of a canvas tool.
             *
             * `:focus-visible` rather than `:focus` so the ring appears for
             * keyboard and programmatic focus but not on mouse press. The
             * offset keeps it clear of the control's own border, and modern
             * browsers follow the element's border-radius automatically.
             */
            ':focus-visible': {
              outline: '2px solid var(--fv-focus-ring)',
              outlineOffset: '2px',
            },
            // MUI's ButtonBase sets `outline: 0` on its root, which is more
            // specific than the bare pseudo-class above and would swallow the
            // ring on every button in the app.
            '.MuiButtonBase-root:focus-visible': {
              outline: '2px solid var(--fv-focus-ring)',
              outlineOffset: '2px',
            },

            /**
             * Honour the OS "reduce motion" setting globally, rather than
             * relying on each component to remember — only the assistant mark
             * ever did.
             *
             * Progress indicators are the deliberate exception. A spinner that
             * doesn't spin has stopped saying "working", so anything marked
             * `data-fv-motion="progress"` keeps looping, just calmly. Everything
             * else — hovers, the card and edge entrances, the button shine —
             * resolves instantly.
             */
            '@media (prefers-reduced-motion: reduce)': {
              '*, *::before, *::after': {
                transitionDuration: '0.01ms !important',
                animationDuration: '0.01ms !important',
                animationIterationCount: '1 !important',
                scrollBehavior: 'auto !important',
              },
              '[data-fv-motion="progress"], [data-fv-motion="progress"] *': {
                animationDuration: '1.6s !important',
                animationIterationCount: 'infinite !important',
              },
            },
          }}
        />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
