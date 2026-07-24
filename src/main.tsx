import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App';
import ErrorBoundary from './shared/components/ErrorBoundary';
import { flowVizTheme } from './shared/theme/flowviz-theme';
// Self-host Inter (the family the theme names) so the UI renders in it rather
// than falling through to Segoe UI / system sans. Just the weights the app uses.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './features/flow-editing/editing.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: flowVizTheme.colors.accent.blue, // Primary blue
    },
    secondary: {
      main: flowVizTheme.colors.accent.orange, // Secondary orange
    },
    background: {
      default: flowVizTheme.colors.background.primary,
      paper: flowVizTheme.colors.background.secondary,
    },
    text: {
      primary: flowVizTheme.colors.text.primary,
      secondary: flowVizTheme.colors.text.secondary,
    },
    success: {
      main: flowVizTheme.colors.accent.green,
    },
    error: {
      main: flowVizTheme.colors.accent.red,
    },
    warning: {
      main: flowVizTheme.colors.accent.orange,
    },
    info: {
      main: flowVizTheme.colors.accent.blue,
    },
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          // Inter is drawn for antialiased rendering. Without this the browser
          // uses subpixel smoothing, which thickens the strokes on a dark UI and
          // makes every weight read a step heavier than intended — the main
          // reason the labels looked off before. Grayscale smoothing renders it
          // at its true weight, the way it's shown on the Inter/Linear specimens.
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        // Tooltips sit on rows of adjacent icon buttons (inspector headers, the
        // app bar, story controls). With MUI's defaults, sweeping across such a
        // row fires each one in turn, and because the outgoing tooltip's exit
        // transition outlives the next one's entrance, two poppers are briefly
        // on screen at once — read as a dark patch flashing under the buttons.
        //
        // A real intent-to-read pause is longer than a sweep, so hold entry
        // long enough to tell them apart, and drop the interactive hover-bridge
        // that kept a dismissed tooltip alive.
        enterDelay: 400,
        enterNextDelay: 400,
        disableInteractive: true,
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
