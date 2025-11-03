import React from 'react';
import { Box, Snackbar, Container, Alert } from '@mui/material';
import { FlowAlert } from './shared/components/Alert';
import { flowVizTheme } from './shared/theme/flowviz-theme';
import { useQuery } from '@tanstack/react-query';
import StreamingFlowVisualization from './features/flow-analysis/components/StreamingFlowVisualization';
import { ClaudeServiceError, NetworkError, APIError, ValidationError } from './features/flow-analysis/services';
import { SaveFlowDialog, LoadFlowDialog } from './features/flow-storage/components';
import { SavedFlow } from './features/flow-storage/types/SavedFlow';
import StreamingProgressBar from './shared/components/StreamingProgressBar';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { AppBar, SearchForm, NewSearchDialog, SettingsDialog } from './features/app/components';
import { useAppState } from './features/app/hooks';

// Text input limits based on Claude's context limits (700k chars max)
const TEXT_LIMITS = {
  MAX_CHARS: 650000,
  WARNING_CHARS: 500000,
  MAX_WORDS: Math.floor(650000 / 5),
} as const;

const getTextStats = (text: string) => {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isNearLimit = chars > TEXT_LIMITS.WARNING_CHARS;
  const isOverLimit = chars > TEXT_LIMITS.MAX_CHARS;
  return { chars, words, isNearLimit, isOverLimit };
};

export default function App() {
  const {
    // Core state
    url,
    submittedUrl,
    textContent,
    submittedText,
    inputMode,
    showError,
    urlError,
    urlHelperText,
    articleContent,
    exportFunction,
    storyModeData,
    getSaveData,
    loadedFlow,
    
    // Dialog states
    newSearchDialogOpen,
    saveFlowDialogOpen,
    loadFlowDialogOpen,
    settingsDialogOpen,
    
    // Settings
    settingsLoaded,
    cinematicMode,
    edgeColor,
    edgeStyle,
    edgeCurve,
    storyModeSpeed,
    
    // Flow management
    hasUnsavedChanges,
    isLoadedFlow,
    isStreaming,
    
    // Toast
    toastOpen,
    toastMessage,
    toastSeverity,
    
    // Setters
    setSubmittedUrl,
    setSubmittedText,
    setTextContent,
    setInputMode,
    setShowError,
    setArticleContent,
    setExportFunction,
    setClearVisualization,
    setStoryModeData,
    setGetSaveData,
    setLoadedFlow,
    setNewSearchDialogOpen,
    setSaveFlowDialogOpen,
    setLoadFlowDialogOpen,
    setSettingsDialogOpen,
    setCinematicMode,
    setEdgeColor,
    setEdgeStyle,
    setEdgeCurve,
    setStoryModeSpeed,
    setHasUnsavedChanges,
    setIsLoadedFlow,
    setIsStreaming,
    setToastOpen,
    
    // Handlers
    handleUrlChange,
    showToast,
    handleSaveSettings,
    clearAllState,
  } = useAppState();

  const { isLoading, error, refetch } = useQuery({
    queryKey: ['article', submittedUrl, submittedText],
    queryFn: async () => {
      // Just set the article content flag to trigger streaming visualization
      if (submittedUrl) {
        setArticleContent({ text: 'URL_PROVIDED', url: submittedUrl });
      } else if (submittedText) {
        setArticleContent({ text: submittedText });
      } else {
        throw new Error('No URL or text provided');
      }
      return null;
    },
    enabled: !!(submittedUrl || submittedText) && !articleContent,
    staleTime: 0,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error) => {
      if (error instanceof ValidationError) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Function to get error details and recovery suggestions
  const getErrorDetails = (error: Error) => {
    if (error instanceof NetworkError) {
      return {
        severity: 'error' as const,
        title: 'Network Connection Failed',
        message: error.message,
        suggestion: 'Please check your internet connection and try again.',
        action: 'Retry',
        icon: <ErrorOutlineIcon />,
      };
    }
    
    if (error instanceof APIError) {
      if (error.statusCode === 401) {
        return {
          severity: 'error' as const,
          title: 'Authentication Error',
          message: error.message,
          suggestion: 'Please check your Anthropic API key in the environment variables.',
          action: 'Check Configuration',
          icon: <WarningIcon />,
        };
      }
      
      if (error.statusCode === 429) {
        return {
          severity: 'warning' as const,
          title: 'Rate Limit Exceeded',
          message: error.message,
          suggestion: 'Please wait a moment and try again, or check your API usage limits.',
          action: 'Retry',
          icon: <WarningIcon />,
        };
      }
      
      if (error.statusCode === 402) {
        return {
          severity: 'error' as const,
          title: 'API Quota Exceeded',
          message: error.message,
          suggestion: 'Please check your Anthropic account billing status and add credits if needed.',
          action: 'Check Billing',
          icon: <ErrorOutlineIcon />,
        };
      }
      
      return {
        severity: 'error' as const,
        title: 'API Error',
        message: error.message,
        suggestion: 'Please try again. If the problem persists, contact support.',
        action: 'Retry',
        icon: <ErrorOutlineIcon />,
      };
    }
    
    if (error instanceof ValidationError) {
      return {
        severity: 'warning' as const,
        title: 'Invalid Input',
        message: error.message,
        suggestion: 'Please check the URL and ensure it points to a valid article.',
        action: 'Try Different URL',
        icon: <WarningIcon />,
      };
    }
    
    if (error instanceof ClaudeServiceError) {
      return {
        severity: 'error' as const,
        title: 'Service Error',
        message: error.message,
        suggestion: 'Please try again. If the problem persists, contact support.',
        action: 'Retry',
        icon: <ErrorOutlineIcon />,
      };
    }
    
    // Generic error
    return {
      severity: 'error' as const,
      title: 'Unexpected Error',
      message: error.message || 'An unexpected error occurred',
      suggestion: 'Please try again or contact support if the problem persists.',
      action: 'Retry',
      icon: <ErrorOutlineIcon />,
    };
  };

  const handleSubmit = (e: React.FormEvent, options?: { provider?: string; model?: string }) => {
    e.preventDefault();

    console.log('Submit with options:', options);

    if (inputMode === 'url') {
      if (!url) {
        setShowError(true);
        return;
      }

      setArticleContent(null);
      setSubmittedUrl(url);
      setSubmittedText('');
      setLoadedFlow(undefined);
      setIsLoadedFlow(false);
    } else {
      if (!textContent.trim()) {
        setShowError(true);
        return;
      }
      if (getTextStats(textContent).isOverLimit) {
        setShowError(true);
        return;
      }

      setArticleContent(null);
      setSubmittedText(textContent);
      setSubmittedUrl('');
      setLoadedFlow(undefined);
      setIsLoadedFlow(false);
    }
  };

  const handleNewSearch = () => {
    setNewSearchDialogOpen(true);
  };
  
  const handleConfirmNewSearch = () => {
    setNewSearchDialogOpen(false);
    clearAllState();
  };
  
  const handleCancelNewSearch = () => {
    setNewSearchDialogOpen(false);
  };

  const handleSaveFirstNewSearch = () => {
    setNewSearchDialogOpen(false);
    setSaveFlowDialogOpen(true);
  };

  const handleRetry = () => {
    if (submittedUrl || submittedText) {
      refetch();
    }
  };

  const handleExportAvailable = (exportFn: (format: 'png' | 'json' | 'afb' | 'flowviz') => void) => {
    setExportFunction(() => exportFn);
  };

  const handleClearAvailable = (clearFn: () => void) => {
    setClearVisualization(() => clearFn);
  };

  const handleStoryModeAvailable = (storyData: any) => {
    setStoryModeData(storyData);
  };

  const handleSaveAvailable = (saveFn: () => { nodes: any[], edges: any[], viewport: any }) => {
    setGetSaveData(() => saveFn);
    if (!isLoadedFlow) {
      setHasUnsavedChanges(true);
    }
  };

  const handleDownloadClick = (format: 'png' | 'json' | 'afb' | 'flowviz') => {
    if (exportFunction) {
      exportFunction(format);
      showToast(`Exported as ${format.toUpperCase()}`, 'success');
    }
  };

  const handleSaveFlow = (flow: SavedFlow) => {
    setHasUnsavedChanges(false);
    setIsLoadedFlow(true);
    showToast(`Analysis "${flow.title}" saved successfully`, 'success');
  };

  const handleLoadFlow = (flow: SavedFlow) => {
    setLoadedFlow({
      nodes: flow.nodes,
      edges: flow.edges,
      viewport: flow.visualization?.viewport
    });
    
    setArticleContent({
      text: flow.sourceText || flow.sourceUrl || 'Loaded from saved flow',
      images: undefined
    });
    
    if (flow.sourceUrl) {
      setSubmittedUrl(flow.sourceUrl);
      setInputMode('url');
    } else if (flow.sourceText) {
      setSubmittedText(flow.sourceText);
      setInputMode('text');
    }
    
    setHasUnsavedChanges(false);
    setIsLoadedFlow(true);
    setLoadFlowDialogOpen(false);
    showToast(`Loaded analysis: "${flow.title}"`, 'success');
  };

  const handleCloseError = () => {
    setShowError(false);
  };

  const handleToastClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setToastOpen(false);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'radial-gradient(circle at 50% 50%, #0d1117 0%, #090b0f 100%)',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%',
        height: '70%',
        background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.15), transparent 70%)',
        filter: 'blur(100px)',
        pointerEvents: 'none',
      },
      display: 'flex',
      flexDirection: 'column',
    }}>
      <AppBar 
        isStreaming={isStreaming}
        exportFunction={exportFunction}
        storyModeData={storyModeData}
        showGraphActions={Boolean(articleContent) && Boolean(submittedUrl || submittedText)}
        onNewSearch={handleNewSearch}
        onDownloadClick={handleDownloadClick}
        onSaveClick={() => setSaveFlowDialogOpen(true)}
        onLoadClick={() => setLoadFlowDialogOpen(true)}
        onSettingsClick={() => setSettingsDialogOpen(true)}
      />
      
      <StreamingProgressBar isVisible={isStreaming} />


      {/* Show main form when no content is submitted */}
      {!submittedUrl && !submittedText && (
        <SearchForm
          isLoading={isLoading}
          isStreaming={isStreaming}
          inputMode={inputMode}
          url={url}
          textContent={textContent}
          urlError={urlError}
          urlHelperText={urlHelperText}
          onInputModeChange={setInputMode}
          onUrlChange={handleUrlChange}
          onTextChange={setTextContent}
          onSubmit={handleSubmit}
        />
      )}

      {/* Show streaming visualization when we have content and settings are loaded */}
      {articleContent && settingsLoaded && (
        <StreamingFlowVisualization 
          url={submittedUrl || submittedText || ''} 
          loadedFlow={loadedFlow}
          onExportAvailable={handleExportAvailable}
          onClearAvailable={handleClearAvailable}
          onStoryModeAvailable={handleStoryModeAvailable}
          onError={(error) => {
            showToast(error.message || 'An error occurred during analysis', 'error');
            // Return to analysis screen and clear inputs
            setArticleContent(null);
            setSubmittedUrl('');
            setSubmittedText('');
            handleUrlChange(''); // Clear URL input
            setTextContent(''); // Clear text input
          }}
          onSaveAvailable={handleSaveAvailable}
          onStreamingStart={() => setIsStreaming(true)}
          onStreamingEnd={() => setIsStreaming(false)}
          cinematicMode={cinematicMode}
          edgeColor={edgeColor}
          edgeStyle={edgeStyle}
          edgeCurve={edgeCurve}
          storyModeSpeed={storyModeSpeed}
        />
      )}

      {/* Error Display */}
      {error && (
        <Container maxWidth="md" sx={{ mt: 2, mb: 4, px: { xs: 2, sm: 3 } }}>
          <FlowAlert
            status={error.message?.includes('VALIDATION_ERROR') ? 'warning' : 'error'}
            title={error.message?.includes('VALIDATION_ERROR') ? 'Input Validation' : 'Analysis Error'}
            onClose={() => window.location.reload()}
            sx={{ mb: 2 }}
          >
            {error.message?.replace('VALIDATION_ERROR: ', '') || 'An error occurred during analysis'}
            {error.message?.includes('too long') && (
              <Box sx={{ mt: 1, fontSize: '0.875rem' }}>
                💡 <strong>Tip:</strong> For very long articles, the system automatically selects the most relevant sections for analysis.
              </Box>
            )}
          </FlowAlert>
        </Container>
      )}

      <Snackbar
        open={showError}
        autoHideDuration={4000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseError}
          severity="warning"
          sx={{
            backgroundColor: flowVizTheme.colors.status.warning.bg,
            color: flowVizTheme.colors.status.warning.text,
            border: `1px solid ${flowVizTheme.colors.status.warning.border}`,
            borderRadius: flowVizTheme.borderRadius.sm,
            backdropFilter: flowVizTheme.effects.blur.light,
            '& .MuiAlert-icon': {
              color: flowVizTheme.colors.status.warning.accent,
            },
          }}
        >
          {inputMode === 'url' 
            ? 'Please enter a URL to analyze' 
            : getTextStats(textContent).isOverLimit 
              ? `Text is too long (${getTextStats(textContent).chars.toLocaleString()} chars). Please reduce to under ${TEXT_LIMITS.MAX_CHARS.toLocaleString()} characters.`
              : 'Please paste some text to analyze'
          }
        </Alert>
      </Snackbar>

      {/* Toast Notifications */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={handleToastClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleToastClose}
          severity={toastSeverity}
          sx={{
            backgroundColor: flowVizTheme.colors.status[toastSeverity as 'success' | 'error' | 'warning' | 'info'].bg,
            color: flowVizTheme.colors.status[toastSeverity as 'success' | 'error' | 'warning' | 'info'].text,
            border: `1px solid ${flowVizTheme.colors.status[toastSeverity as 'success' | 'error' | 'warning' | 'info'].border}`,
            borderRadius: flowVizTheme.borderRadius.sm,
            backdropFilter: flowVizTheme.effects.blur.light,
            boxShadow: flowVizTheme.effects.shadows.md,
            '& .MuiAlert-icon': {
              color: flowVizTheme.colors.status[toastSeverity as 'success' | 'error' | 'warning' | 'info'].accent,
            },
          }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>

      {/* New Search Confirmation Dialog */}
      <NewSearchDialog
        open={newSearchDialogOpen}
        hasUnsavedChanges={hasUnsavedChanges}
        onClose={handleCancelNewSearch}
        onConfirm={handleConfirmNewSearch}
        onSaveFirst={handleSaveFirstNewSearch}
      />

      {/* Save Flow Dialog */}
      {getSaveData && (
        <SaveFlowDialog
          open={saveFlowDialogOpen}
          onClose={() => setSaveFlowDialogOpen(false)}
          nodes={getSaveData().nodes}
          edges={getSaveData().edges}
          sourceUrl={submittedUrl}
          sourceText={submittedText}
          inputMode={inputMode}
          viewport={getSaveData().viewport}
          onSave={handleSaveFlow}
        />
      )}

      {/* Load Flow Dialog */}
      <LoadFlowDialog
        open={loadFlowDialogOpen}
        onClose={() => setLoadFlowDialogOpen(false)}
        onLoad={handleLoadFlow}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsDialogOpen && settingsLoaded}
        cinematicMode={cinematicMode}
        edgeColor={edgeColor}
        edgeStyle={edgeStyle}
        edgeCurve={edgeCurve}
        storyModeSpeed={storyModeSpeed}
        onClose={() => setSettingsDialogOpen(false)}
        onCinematicModeChange={setCinematicMode}
        onEdgeColorChange={setEdgeColor}
        onEdgeStyleChange={setEdgeStyle}
        onEdgeCurveChange={setEdgeCurve}
        onStoryModeSpeedChange={setStoryModeSpeed}
        onSave={handleSaveSettings}
      />
    </Box>
  );
}