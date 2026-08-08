import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import ErrorBoundary from './shared/components/ErrorBoundary';
import ThemeModeProvider from './shared/theme/ThemeModeProvider';
import { AuthProvider } from './features/account';
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Outermost, so the error fallback is themed too — it styles itself from
        the same CSS variables this provider publishes. */}
    <ThemeModeProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          {/* Inside the query provider, which it uses to drop cached data
              belonging to a previous identity. A no-op unless this build is
              configured with a Supabase project. */}
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </ThemeModeProvider>
  </React.StrictMode>,
);
