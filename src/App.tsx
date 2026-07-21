import React, { useEffect, useState } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import { flowVizTheme } from './shared/theme/flowviz-theme';
import StreamingFlowVisualization from './features/flow-analysis/components/StreamingFlowVisualization';
import { SaveFlowDialog, LoadFlowDialog } from './features/flow-storage/components';
import { SavedFlow } from './features/flow-storage/types/SavedFlow';
import StreamingProgressBar from './shared/components/StreamingProgressBar';
import { AppBar, NewSearchDialog, SettingsDialog, AnalyzeDialog } from './features/app/components';
import type { AnalyzeMode } from './features/app/components/AnalyzeDialog';
import { useAppState } from './features/app/hooks';
import { useProviderConfig } from './features/app/hooks/useProviderConfig';
// Input limits based on Claude's context window; shared with AnalysisInput so
// the submit guard and the character counter can't drift apart.
import { TEXT_LIMITS, getTextStats } from './shared/utils/textLimits';

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
    exportFunction,
    storyModeData,
    getSaveData,
    loadedFlow,

    // Analysis
    analysisRequest,
    setAnalysisRequest,

    // Dialog states
    newSearchDialogOpen,
    analyzeDialogOpen,
    saveFlowDialogOpen,
    loadFlowDialogOpen,
    settingsDialogOpen,

    // Settings
    settingsLoaded,
    edgeColor,
    edgeStyle,
    edgeCurve,
    storyModeSpeed,
    selectedProvider,
    selectedModel,

    // Flow management
    hasUnsavedChanges,
    isStreaming,
    currentFlowId,

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
    setExportFunction,
    setClearVisualization,
    setStoryModeData,
    setGetSaveData,
    setLoadedFlow,
    setNewSearchDialogOpen,
    setAnalyzeDialogOpen,
    setSaveFlowDialogOpen,
    setLoadFlowDialogOpen,
    setSettingsDialogOpen,
    setEdgeColor,
    setEdgeStyle,
    setEdgeCurve,
    setStoryModeSpeed,
    setSelectedProvider,
    setSelectedModel,
    setHasUnsavedChanges,
    setIsLoadedFlow,
    setIsStreaming,
    setCurrentFlowId,
    setToastOpen,

    // Handlers
    handleUrlChange,
    showToast,
    handleSaveSettings,
    clearAllState,
  } = useAppState();

  // Analyse-dialog choices. Transient to one open/submit cycle, so they stay
  // local rather than joining the persisted app state.
  const [analyzeMode, setAnalyzeMode] = useState<AnalyzeMode>('merge');
  const [canvasHasContent, setCanvasHasContent] = useState(false);

  // Get provider defaults
  const providerConfig = useProviderConfig();

  // Auto-set provider/model defaults on initial load if not set
  useEffect(() => {
    // Wait for both settings and provider config to load, then set defaults if empty
    if (
      settingsLoaded &&
      !providerConfig.isLoading &&
      (!selectedProvider || selectedProvider === '' || selectedProvider === null) &&
      providerConfig.selectedProvider &&
      providerConfig.selectedModel
    ) {
      setSelectedProvider(providerConfig.selectedProvider);
      setSelectedModel(providerConfig.selectedModel);
      // Save to localStorage immediately
      localStorage.setItem('ai_provider', providerConfig.selectedProvider);
      localStorage.setItem('ai_model', providerConfig.selectedModel);
    }
  }, [
    settingsLoaded,
    providerConfig.isLoading,
    selectedProvider,
    providerConfig.selectedProvider,
    providerConfig.selectedModel,
    setSelectedProvider,
    setSelectedModel
  ]);

  /**
   * Start an analysis. `mode` comes from the user's choice in the Analyse
   * dialog, and defaults to 'replace' for an empty canvas where there is
   * nothing to merge into.
   */
  const handleSubmit = (e: React.FormEvent, mode: 'merge' | 'replace' = 'replace') => {
    e.preventDefault();

    const isUrlMode = inputMode === 'url';
    const input = isUrlMode ? url : textContent;

    if (isUrlMode) {
      if (!url) {
        setShowError(true);
        return;
      }
    } else {
      if (!textContent.trim() || getTextStats(textContent).isOverLimit) {
        setShowError(true);
        return;
      }
    }

    // A merge keeps the canvas it is merging into, so it must not reset the
    // loaded-flow bookkeeping that tracks what is on screen.
    if (mode === 'replace') {
      setLoadedFlow(undefined);
      setIsLoadedFlow(false);
      setCurrentFlowId(null);
    }
    setSubmittedUrl(isUrlMode ? url : '');
    setSubmittedText(isUrlMode ? '' : textContent);

    setAnalysisRequest({
      id: crypto.randomUUID(),
      input,
      mode,
      provider: selectedProvider,
      model: selectedModel,
    });
  };

  /**
   * Opening the Analyse dialog. Whether there is anything to merge into is
   * read from the canvas at open time via the registered save-data getter,
   * which is the only handle App has on the live node list.
   */
  const handleNewSearch = () => {
    const nodeCount = getSaveData ? getSaveData().nodes.length : 0;
    setCanvasHasContent(nodeCount > 0);
    // Merging is the point of the feature, so default to it whenever there is
    // something to merge into.
    setAnalyzeMode(nodeCount > 0 ? 'merge' : 'replace');
    setAnalyzeDialogOpen(true);
  };

  const handleAnalyzeSubmit = (e: React.FormEvent) => {
    setAnalyzeDialogOpen(false);
    handleSubmit(e, canvasHasContent ? analyzeMode : 'replace');
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
  };

  // Fired by the visualization whenever graph content actually changes
  // (manual edits, undo/redo) - drives the dirty flag for ALL flows,
  // including loaded ones
  const handleContentChanged = () => {
    setHasUnsavedChanges(true);
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
    setCurrentFlowId(flow.id);
    showToast(`Analysis "${flow.title}" saved successfully`, 'success');
  };

  const handleLoadFlow = (flow: SavedFlow) => {
    setCurrentFlowId(flow.id);
    setLoadedFlow({
      nodes: flow.nodes,
      edges: flow.edges,
      viewport: flow.visualization?.viewport
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
      // Exactly the viewport, not at least it: the app shell is a fixed frame
      // with the canvas taking whatever the app bar leaves.
      height: '100vh',
      overflow: 'hidden',
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
        showGraphActions={settingsLoaded}
        onNewSearch={handleNewSearch}
        onDownloadClick={handleDownloadClick}
        onSaveClick={() => setSaveFlowDialogOpen(true)}
        onLoadClick={() => setLoadFlowDialogOpen(true)}
        onSettingsClick={() => setSettingsDialogOpen(true)}
      />
      
      <StreamingProgressBar isVisible={isStreaming} />
      {/* Show visualization for analyses, loaded flows, and blank-canvas editing */}
      {settingsLoaded && (
        <StreamingFlowVisualization
          url={submittedUrl || submittedText || ''}
          analysisRequest={analysisRequest}
          onAnalyzeRequested={handleNewSearch}
          onClearRequested={() => setNewSearchDialogOpen(true)}
          loadedFlow={loadedFlow}
          onExportAvailable={handleExportAvailable}
          onClearAvailable={handleClearAvailable}
          onStoryModeAvailable={handleStoryModeAvailable}
          onError={(error, mode) => {
            if (mode === 'merge') {
              // The canvas belongs to the user, not to this analysis, so a
              // failed merge must leave it standing.
              showToast(
                error.message || 'Analysis failed — the canvas is unchanged',
                'error'
              );
              setAnalysisRequest(null);
              return;
            }
            showToast(error.message || 'An error occurred during analysis', 'error');
            // Clear the inputs so the dialog reopens empty.
            setSubmittedUrl('');
            setSubmittedText('');
            setAnalysisRequest(null);
            handleUrlChange(''); // Clear URL input
            setTextContent(''); // Clear text input
          }}
          onSaveAvailable={handleSaveAvailable}
          onContentChanged={handleContentChanged}
          onStreamingStart={() => setIsStreaming(true)}
          onStreamingEnd={() => {
            setIsStreaming(false);
            // A freshly generated analysis is unsaved content
            setHasUnsavedChanges(true);
          }}
          edgeColor={edgeColor}
          edgeStyle={edgeStyle}
          edgeCurve={edgeCurve}
          storyModeSpeed={storyModeSpeed}
        />
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

      {/* Analyse a report from the canvas */}
      <AnalyzeDialog
        open={analyzeDialogOpen}
        onClose={() => setAnalyzeDialogOpen(false)}
        mode={analyzeMode}
        onModeChange={setAnalyzeMode}
        hasUnsavedChanges={hasUnsavedChanges}
        canvasHasContent={canvasHasContent}
        isLoading={isStreaming}
        inputMode={inputMode}
        url={url}
        textContent={textContent}
        urlError={urlError}
        urlHelperText={urlHelperText}
        onInputModeChange={setInputMode}
        onUrlChange={handleUrlChange}
        onTextChange={setTextContent}
        onSubmit={handleAnalyzeSubmit}
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
          inputMode={inputMode === 'pdf' ? 'text' : inputMode}
          viewport={getSaveData().viewport}
          existingFlowId={currentFlowId}
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
        edgeColor={edgeColor}
        edgeStyle={edgeStyle}
        edgeCurve={edgeCurve}
        storyModeSpeed={storyModeSpeed}
        selectedProvider={selectedProvider}
        selectedModel={selectedModel}
        onClose={() => setSettingsDialogOpen(false)}
        onEdgeColorChange={setEdgeColor}
        onEdgeStyleChange={setEdgeStyle}
        onEdgeCurveChange={setEdgeCurve}
        onStoryModeSpeedChange={setStoryModeSpeed}
        onProviderChange={setSelectedProvider}
        onModelChange={setSelectedModel}
        onSave={handleSaveSettings}
      />
    </Box>
  );
}