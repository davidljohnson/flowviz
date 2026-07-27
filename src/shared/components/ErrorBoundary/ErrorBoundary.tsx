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
import { flowVizTheme } from '../../theme/flowviz-theme';

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
                backgroundColor: 'rgba(var(--fv-raised-rgb), 0.4)',
                border: '1px solid rgba(var(--fv-overlay-rgb), 0.1)',
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
                  color: 'rgba(var(--fv-overlay-rgb), 0.7)',
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
                  {/* Vite's own flag — `process` is a Node global that does not
                      exist in the browser bundle. */}
                  {import.meta.env.DEV && this.state.errorInfo && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                        Component Stack:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          whiteSpace: 'pre-wrap',
                          maxHeight: 200,
                          overflow: 'auto',
                          backgroundColor: flowVizTheme.colors.surface.active,
                          p: 1,
                          borderRadius: flowVizTheme.borderRadius.xs
                        }}
                      >
                        {this.state.errorInfo.componentStack}
                      </Typography>
                    </Box>
                  )}
                </Alert>
              )}

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReload}
                  sx={{
                    backgroundColor: flowVizTheme.colors.accent.blue,
                    '&:hover': {
                      backgroundColor: flowVizTheme.colors.status.info.accent
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
                    color: 'rgba(var(--fv-overlay-rgb), 0.9)',
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