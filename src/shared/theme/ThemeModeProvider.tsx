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
          }}
        />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
