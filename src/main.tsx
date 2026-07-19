import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import App from './App';
import ErrorBoundary from './shared/components/ErrorBoundary';
import { flowVizTheme } from './shared/theme/flowviz-theme';
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
