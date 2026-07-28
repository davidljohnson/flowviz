import React, { useEffect, useState } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DownloadIcon from '@mui/icons-material/Download';
import SettingsIcon from '@mui/icons-material/Settings';
import { flowVizTheme } from './shared/theme/flowviz-theme';
import StreamingFlowVisualization from './features/flow-analysis/components/StreamingFlowVisualization';
import { SaveFlowDialog, LoadFlowDialog } from './features/flow-storage/components';
import { SavedFlow } from './features/flow-storage/types/SavedFlow';
import StreamingProgressBar from './shared/components/StreamingProgressBar';
import { AppBar, NewSearchDialog, SettingsDialog, AnalyzeDialog } from './features/app/components';
import type { AnalyzeMode } from './features/app/components/AnalyzeDialog';
import type { Command } from './features/flow-editing';
import { useAppState, useAppShortcuts } from './features/app/hooks';
import { useProviderConfig, isModelAvailable } from './features/app/hooks/useProviderConfig';
import { shortcut } from './shared/utils/shortcuts';
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
    edgeColor,
    edgeStyle,
    edgeCurve,
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
    clearAllState,
  } = useAppState();

  // Analyse-dialog choices. Transient to one open/submit cycle, so they stay
  // local rather than joining the persisted app state.
  const [analyzeMode, setAnalyzeMode] = useState<AnalyzeMode>('merge');

  /**
   * Nodes on the canvas, reported by the visualization whenever that changes.
   *
   * The alternative was calling the registered save-data getter, which App did
   * in two places — but that only answers when asked, and App does not re-render
   * when the graph does, so anything rendered from it went stale. The app bar's
   * Save button has to track this continuously, so the count is pushed here.
   */
  const [canvasNodeCount, setCanvasNodeCount] = useState(0);
  const canvasHasContent = canvasNodeCount > 0;

  // Article text extracted server-side during a URL analysis. Held here so
  // Save can persist it as the flow's sourceText (pasted text already flows
  // through submittedText).
  const [extractedText, setExtractedText] = useState('');

  // Get provider defaults
  const providerConfig = useProviderConfig();

  // Point the stored provider/model at something usable.
  //
  // Two cases, not one: nothing is stored yet, or what is stored is a model no
  // configured provider offers any more — a key was removed, or the model was
  // retired. The second used to be repaired by opening settings and pressing
  // Save; with settings applying as they change there is no such moment, so the
  // repair belongs here. Both setters persist, so it sticks.
  useEffect(() => {
    if (providerConfig.isLoading) return;

    const needsRepair =
      !selectedProvider || !isModelAvailable(providerConfig.providers, selectedModel);

    // Only ever repair TO a model we've confirmed is on offer. Writing an
    // unavailable one would leave needsRepair true and spin the effect.
    if (
      needsRepair &&
      providerConfig.selectedProvider &&
      isModelAvailable(providerConfig.providers, providerConfig.selectedModel)
    ) {
      setSelectedProvider(providerConfig.selectedProvider);
      setSelectedModel(providerConfig.selectedModel);
    }
  }, [
    providerConfig.isLoading,
    providerConfig.providers,
    selectedProvider,
    selectedModel,
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
      setExtractedText('');
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

  const handleNewSearch = () => {
    // Merging is the point of the feature, so default to it whenever there is
    // something to merge into.
    setAnalyzeMode(canvasHasContent ? 'merge' : 'replace');
    setAnalyzeDialogOpen(true);
  };

  const handleAnalyzeSubmit = (e: React.FormEvent) => {
    setAnalyzeDialogOpen(false);
    handleSubmit(e, canvasHasContent ? analyzeMode : 'replace');
  };
  
  const handleConfirmNewSearch = () => {
    setNewSearchDialogOpen(false);
    setExtractedText('');
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

  const handleSaveAvailable = (saveFn: () => { nodes: any[], edges: any[], viewport: any, assistantMessages?: any[] }) => {
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
    setExtractedText(flow.sourceText || '');
    setLoadedFlow({
      nodes: flow.nodes,
      edges: flow.edges,
      viewport: flow.visualization?.viewport,
      sourceText: flow.sourceText,
      assistantMessages: flow.assistantMessages
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

  const canExport = Boolean(exportFunction) && canvasHasContent;

  // Owned here rather than in the visualization: the app bar has a trigger for
  // the palette too, and one boolean with two owners is how a popover ends up
  // disagreeing with the control that opened it.
  const [paletteOpen, setPaletteOpen] = useState(false);

  useAppShortcuts({
    enabled: !isStreaming,
    canSave: canvasHasContent,
    canExport,
    onSave: () => setSaveFlowDialogOpen(true),
    onLoad: () => setLoadFlowDialogOpen(true),
    // Straight to PNG. The app bar's button opens a format menu, but a
    // shortcut that only opens another menu isn't worth a keystroke, and PNG is
    // the format people actually reach for — the other three stay on the menu.
    onExport: () => handleDownloadClick('png'),
    onSettings: () => setSettingsDialogOpen(true),
  });

  /**
   * The ⌘K entries for actions App owns rather than the canvas.
   *
   * The palette had every canvas command and none of the file ones, so the
   * things the app bar does were the only part of the product with no keyboard
   * route at all. Passing them down rather than adding four more callback props
   * keeps the labels, icons and disabled tests next to the state they read.
   *
   * Rebuilt each render rather than memoised: the visualization below is not
   * memoised either, so it re-renders with App whatever this array's identity
   * is, and a dependency list that quietly omitted `handleDownloadClick` to
   * keep the memo intact would be buying nothing with a stale closure.
   */
  const hostCommands: Command[] = [
    {
      id: 'save-flow',
      label: 'Save analysis…',
      hint: shortcut('S'),
      keywords: 'store keep persist write disk',
      icon: SaveIcon,
      disabled: !canvasHasContent,
      run: () => setSaveFlowDialogOpen(true),
    },
    {
      id: 'load-flow',
      label: 'Load analysis…',
      hint: shortcut('O'),
      keywords: 'open restore saved recent browse',
      icon: FolderOpenIcon,
      run: () => setLoadFlowDialogOpen(true),
    },
    {
      id: 'export-png',
      label: 'Export as PNG',
      hint: shortcut('E'),
      keywords: 'download image picture screenshot save',
      icon: DownloadIcon,
      disabled: !canExport,
      run: () => handleDownloadClick('png'),
    },
    {
      id: 'export-stix',
      label: 'Export as STIX bundle',
      keywords: 'download json threat intel share',
      icon: DownloadIcon,
      disabled: !canExport,
      run: () => handleDownloadClick('json'),
    },
    {
      id: 'export-afb',
      label: 'Export as AFB',
      keywords: 'download attack flow builder',
      icon: DownloadIcon,
      disabled: !canExport,
      run: () => handleDownloadClick('afb'),
    },
    {
      id: 'export-flowviz',
      label: 'Export as FlowViz',
      keywords: 'download json native viewport',
      icon: DownloadIcon,
      disabled: !canExport,
      run: () => handleDownloadClick('flowviz'),
    },
    {
      id: 'settings',
      label: 'Settings…',
      hint: shortcut(','),
      keywords: 'preferences provider model edge colour theme',
      icon: SettingsIcon,
      run: () => setSettingsDialogOpen(true),
    },
  ];

  return (
    <Box sx={{
      // Exactly the viewport, not at least it: the app shell is a fixed frame
      // with the canvas taking whatever the app bar leaves.
      height: '100vh',
      overflow: 'hidden',
      background: flowVizTheme.colors.canvas.backdrop,
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%',
        height: '70%',
        background: flowVizTheme.colors.canvas.bloom,
        filter: 'blur(100px)',
        pointerEvents: 'none',
      },
      display: 'flex',
      flexDirection: 'column',
    }}>
      <AppBar
        exportFunction={exportFunction}
        canvasHasContent={canvasHasContent}
        onNewSearch={handleNewSearch}
        onDownloadClick={handleDownloadClick}
        onSaveClick={() => setSaveFlowDialogOpen(true)}
        onLoadClick={() => setLoadFlowDialogOpen(true)}
        onSettingsClick={() => setSettingsDialogOpen(true)}
        onOpenCommandPalette={() => setPaletteOpen(true)}
      />
      
      <StreamingProgressBar isVisible={isStreaming} />
      {/* Show visualization for analyses, loaded flows, and blank-canvas editing */}
      <StreamingFlowVisualization
        url={submittedUrl || submittedText || ''}
        analysisRequest={analysisRequest}
        onAnalyzeRequested={handleNewSearch}
        onClearRequested={() => setNewSearchDialogOpen(true)}
        hostCommands={hostCommands}
        paletteOpen={paletteOpen}
        onPaletteOpenChange={setPaletteOpen}
        loadedFlow={loadedFlow}
        onArticleExtracted={(text) => setExtractedText(text)}
        onExportAvailable={handleExportAvailable}
        onClearAvailable={handleClearAvailable}
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
        onNodeCountChange={setCanvasNodeCount}
        onStreamingStart={() => setIsStreaming(true)}
        onStreamingEnd={() => {
          setIsStreaming(false);
          // A freshly generated analysis is unsaved content
          setHasUnsavedChanges(true);
        }}
        edgeColor={edgeColor}
        edgeStyle={edgeStyle}
        edgeCurve={edgeCurve}
        selectedProvider={selectedProvider}
        selectedModel={selectedModel}
      />
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
          sourceText={submittedText || extractedText}
          inputMode={inputMode === 'pdf' ? 'text' : inputMode}
          viewport={getSaveData().viewport}
          assistantMessages={getSaveData().assistantMessages}
          existingFlowId={currentFlowId}
          onSave={handleSaveFlow}
        />
      )}

      {/* Load Flow Dialog */}
      <LoadFlowDialog
        open={loadFlowDialogOpen}
        hasUnsavedChanges={hasUnsavedChanges}
        onClose={() => setLoadFlowDialogOpen(false)}
        onLoad={handleLoadFlow}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsDialogOpen}
        edgeColor={edgeColor}
        edgeStyle={edgeStyle}
        edgeCurve={edgeCurve}
        selectedModel={selectedModel}
        onClose={() => setSettingsDialogOpen(false)}
        onEdgeColorChange={setEdgeColor}
        onEdgeStyleChange={setEdgeStyle}
        onEdgeCurveChange={setEdgeCurve}
        onProviderChange={setSelectedProvider}
        onModelChange={setSelectedModel}
      />
    </Box>
  );
}