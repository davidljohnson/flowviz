import React from 'react';
import { Alert, AlertTitle, Box, Button, Typography } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import ErrorBoundary from './ErrorBoundary';
import { ClaudeServiceError, NetworkError, APIError, ValidationError } from '../../../features/flow-analysis/services';
import { flowVizTheme } from '../../theme/flowviz-theme';

interface ServiceErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
}

const ServiceErrorFallback: React.FC<{ error: Error; onRetry?: () => void }> = ({ error, onRetry }) => {
  const getErrorInfo = () => {
    if (error instanceof NetworkError) {
      return {
        severity: 'error' as const,
        title: 'Network Connection Failed',
        message: error.message,
        suggestion: 'Please check your internet connection and try again.',
        canRetry: true
      };
    }
    
    if (error instanceof APIError) {
      if (error.statusCode === 401) {
        return {
          severity: 'error' as const,
          title: 'Authentication Error',
          message: error.message,
          suggestion: 'Please check your Anthropic API key configuration.',
          canRetry: false
        };
      }
      
      if (error.statusCode === 429) {
        return {
          severity: 'warning' as const,
          title: 'Rate Limit Exceeded',
          message: error.message,
          suggestion: 'Please wait a moment before trying again.',
          canRetry: true
        };
      }
      
      return {
        severity: 'error' as const,
        title: 'API Error',
        message: error.message,
        suggestion: 'There was an issue with the API request.',
        canRetry: true
      };
    }
    
    if (error instanceof ValidationError) {
      return {
        severity: 'warning' as const,
        title: 'Input Validation Error',
        message: error.message,
        suggestion: 'Please check your input and try again.',
        canRetry: false
      };
    }
    
    if (error instanceof ClaudeServiceError) {
      return {
        severity: 'error' as const,
        title: 'Service Error',
        message: error.message,
        suggestion: 'There was an issue with the analysis service.',
        canRetry: true
      };
    }
    
    return {
      severity: 'error' as const,
      title: 'Unexpected Error',
      message: error.message,
      suggestion: 'An unexpected error occurred.',
      canRetry: true
    };
  };

  const errorInfo = getErrorInfo();

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Alert 
        severity={errorInfo.severity}
        sx={{
          backgroundColor: errorInfo.severity === 'error' 
            ? flowVizTheme.colors.status.error.bg
            : flowVizTheme.colors.status.warning.bg,
          border: errorInfo.severity === 'error'
            ? `1px solid ${flowVizTheme.colors.status.error.border}`
            : `1px solid ${flowVizTheme.colors.status.warning.border}`,
          color: errorInfo.severity === 'error' ? flowVizTheme.colors.status.error.text : flowVizTheme.colors.status.warning.text,
          '& .MuiAlert-icon': {
            color: errorInfo.severity === 'error' ? flowVizTheme.colors.status.error.accent : flowVizTheme.colors.status.warning.accent
          }
        }}
      >
        <AlertTitle>{errorInfo.title}</AlertTitle>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {errorInfo.message}
        </Typography>
        
        {errorInfo.suggestion && (
          <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
            💡 {errorInfo.suggestion}
          </Typography>
        )}
        
        {errorInfo.canRetry && onRetry && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            sx={{
              borderColor: 'currentColor',
              color: 'inherit',
              '&:hover': {
                backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.1)'
              }
            }}
          >
            Try Again
          </Button>
        )}
      </Alert>
    </Box>
  );
};

const ServiceErrorBoundary: React.FC<ServiceErrorBoundaryProps> = ({ children, onRetry }) => {
  return (
    <ErrorBoundary
      fallback={<ServiceErrorFallback error={new Error('Service error')} onRetry={onRetry} />}
      onError={(error) => {
        // Log service errors for monitoring
        if (error instanceof ClaudeServiceError || 
            error instanceof NetworkError || 
            error instanceof APIError || 
            error instanceof ValidationError) {
          console.error('Service error caught by boundary:', {
            type: error.constructor.name,
            message: error.message,
            statusCode: 'statusCode' in error ? error.statusCode : undefined,
            timestamp: new Date().toISOString()
          });
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ServiceErrorBoundary;
export { ServiceErrorFallback };