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
            background: 'radial-gradient(circle at 50% 50%, #0d1117 0%, #090b0f 100%)',
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
                backgroundColor: 'rgba(22, 27, 34, 0.4)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 3,
                textAlign: 'center'
              }}
            >
              <ErrorOutlineIcon
                sx={{
                  fontSize: 64,
                  color: '#ef4444',
                  mb: 2
                }}
              />
              
              <Typography
                variant="h4"
                sx={{
                  color: '#fff',
                  fontWeight: 600,
                  mb: 2
                }}
              >
                Something went wrong
              </Typography>
              
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
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
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#fca5a5',
                    '& .MuiAlert-icon': {
                      color: '#ef4444'
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
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                          p: 1,
                          borderRadius: 1
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
                    backgroundColor: '#3b82f6',
                    '&:hover': {
                      backgroundColor: '#2563eb'
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
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
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