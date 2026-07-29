import { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Container,
  Paper
} from '@mui/material';
import {
  ErrorOutline as ErrorOutlineIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { createScrollbarStyle, flowVizTheme } from '../../theme/flowviz-theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Box
          sx={{
            minHeight: '100vh',
            background: flowVizTheme.colors.canvas.backdrop,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2
          }}
        >
          <Container maxWidth="md">
            <Paper
              elevation={0}
              sx={{
                p: 4,
                // Opaque, and the token rather than an alpha of its rgb triple.
                // `rgba(var(--fv-raised-rgb), 0.4)` was 40% of a dark fill over
                // a near-black canvas, which composited to #0e1117 — darker
                // than the page it was supposed to sit above. That is why
                // nothing could recess into it: the stack-trace well measured
                // 1.03 against this panel, because a black wash over something
                // already almost black has nowhere to go.
                backgroundColor: flowVizTheme.colors.background.raised,
                border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
                // It floats over the canvas with no scrim behind it.
                boxShadow: flowVizTheme.effects.shadows.lg,
                borderRadius: flowVizTheme.borderRadius.lg,
                textAlign: 'center'
              }}
            >
              <ErrorOutlineIcon
                sx={{
                  fontSize: 64,
                  color: flowVizTheme.colors.accent.red,
                  mb: 2
                }}
              />
              
              <Typography
                variant="h4"
                sx={{
                  color: flowVizTheme.colors.text.primary,
                  fontWeight: 600,
                  mb: 2
                }}
              >
                Something went wrong
              </Typography>
              
              <Typography
                variant="body1"
                sx={{
                  color: flowVizTheme.colors.text.secondary,
                  mb: 3,
                  maxWidth: 600,
                  mx: 'auto'
                }}
              >
                An unexpected error occurred while rendering the application. 
                This might be due to a component error or data processing issue.
              </Typography>

              {this.state.error && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 3,
                    backgroundColor: flowVizTheme.colors.status.error.bg,
                    border: `1px solid ${flowVizTheme.colors.status.error.border}`,
                    color: flowVizTheme.colors.status.error.text,
                    '& .MuiAlert-icon': {
                      color: flowVizTheme.colors.status.error.accent
                    }
                  }}
                >
                  <AlertTitle>Error Details</AlertTitle>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {this.state.error.message}
                  </Typography>
                </Alert>
              )}

              {/* Outside the Alert on purpose.
                  A stack trace is not the error, it is context for it, and
                  nesting it inside a red panel meant the well it sits in could
                  only ever be a darker red — a wash over an already-tinted
                  surface has almost nowhere to go, which is why `recessed`
                  measured 1.08 against it and even `recessedStrong` only
                  reached 1.14. On the plain panel `recessed` does the job it is
                  documented for, and the trace stops borrowing the alert's
                  error colour for text that is not itself an error.

                  Vite's own flag — `process` is a Node global that does not
                  exist in the browser bundle. */}
              {import.meta.env.DEV && this.state.errorInfo && (
                // The panel centres its content, which is right for the heading
                // and buttons and wrong for a wrapped monospace trace.
                <Box sx={{ mb: 3, textAlign: 'left' }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      mb: 1,
                      color: flowVizTheme.colors.text.secondary,
                    }}
                  >
                    Component stack
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      whiteSpace: 'pre-wrap',
                      maxHeight: 200,
                      overflow: 'auto',
                      color: flowVizTheme.colors.text.tertiary,
                      backgroundColor: flowVizTheme.colors.surface.recessed,
                      // The panel it sits on is itself translucent, so the well
                      // needs an edge to land against as well as a fill.
                      border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
                      borderRadius: flowVizTheme.borderRadius.sm,
                      p: 1.5,
                      ...createScrollbarStyle(),
                    }}
                  >
                    {this.state.errorInfo.componentStack}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReload}
                  // The primary action inverts against the page rather than
                  // taking a colour — the same gesture as the public site's
                  // .btn-primary, and as the assistant's send button. This was
                  // the one filled blue button in the app, which read as an
                  // accent system that nothing else belonged to.
                  sx={{
                    backgroundColor: flowVizTheme.colors.inverse.surface,
                    color: flowVizTheme.colors.inverse.text,
                    '&:hover': {
                      backgroundColor: flowVizTheme.colors.inverse.surfaceHover
                    }
                  }}
                >
                  Reload Page
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<HomeIcon />}
                  onClick={this.handleGoHome}
                  sx={{
                    borderColor: 'rgba(var(--fv-overlay-rgb), 0.3)',
                    color: flowVizTheme.colors.text.primary,
                    '&:hover': {
                      borderColor: 'rgba(var(--fv-overlay-rgb), 0.5)',
                      backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.1)'
                    }
                  }}
                >
                  Go Home
                </Button>
              </Box>
            </Paper>
          </Container>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;