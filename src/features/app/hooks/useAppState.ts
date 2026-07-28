import { useState, useEffect, useCallback } from 'react';
import type { AnalysisRequest } from '../../flow-analysis/types/analysisRequest';

/**
 * A string setting that lives in localStorage.
 *
 * Persistence belongs to the setter because the settings dialog has no Save
 * button: every change applies the moment it's made, so there is no later point
 * at which to write. Holding the key next to the state is what stops the read
 * and the write drifting apart — they already had, with App.tsx setting the
 * provider and writing `ai_provider` by hand while the dialog wrote it only
 * when Save was pressed.
 *
 * The read is a lazy initialiser rather than a mount effect so the first render
 * already holds the stored value instead of briefly showing a default. `||`
 * rather than `??` so a stored empty string falls back, matching the truthiness
 * check the mount effect used to do.
 */
const usePersistedSetting = (key: string, fallback: string) => {
  const [value, setValue] = useState(() => localStorage.getItem(key) || fallback);
  const set = useCallback(
    (next: string) => {
      setValue(next);
      localStorage.setItem(key, next);
    },
    [key],
  );
  return [value, set] as const;
};

// URL validation helper
const isValidUrl = (urlString: string): boolean => {
  if (!urlString || !urlString.trim()) return false;
  
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const useAppState = () => {
  // Core form state
  const [url, setUrl] = useState('');
  const [submittedUrl, setSubmittedUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [submittedText, setSubmittedText] = useState('');
  const [inputMode, setInputMode] = useState<'url' | 'text' | 'pdf'>('url');
  
  // UI state
  const [showError, setShowError] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [urlError, setUrlError] = useState(false);
  const [urlHelperText, setUrlHelperText] = useState('');
  
  // Content and visualization state
  const [exportFunction, setExportFunction] = useState<((format: 'png' | 'json' | 'afb' | 'flowviz') => void) | null>(null);
  const [clearVisualization, setClearVisualization] = useState<(() => void) | null>(null);
  const [getSaveData, setGetSaveData] = useState<(() => { nodes: any[], edges: any[], viewport: any, assistantMessages?: any[] }) | null>(null);
  const [loadedFlow, setLoadedFlow] = useState<{ nodes: any[], edges: any[], viewport?: any, sourceText?: string, assistantMessages?: any[] } | undefined>(undefined);
  
  // The current analysis request. Distinct from submittedUrl/submittedText,
  // which gate the landing-page-vs-canvas branch; this is what actually starts
  // a stream, and carries a fresh id each time so the same input can be
  // analysed more than once.
  const [analysisRequest, setAnalysisRequest] = useState<AnalysisRequest | null>(null);

  // Dialog states
  const [newSearchDialogOpen, setNewSearchDialogOpen] = useState(false);
  const [analyzeDialogOpen, setAnalyzeDialogOpen] = useState(false);
  const [saveFlowDialogOpen, setSaveFlowDialogOpen] = useState(false);
  const [loadFlowDialogOpen, setLoadFlowDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  
  // Settings. Each reads its stored value on the first render and writes on
  // every change — see usePersistedSetting.
  const [edgeColor, setEdgeColor] = usePersistedSetting('edge_color', 'default');
  const [edgeStyle, setEdgeStyle] = usePersistedSetting('edge_style', 'solid');
  const [edgeCurve, setEdgeCurve] = usePersistedSetting('edge_curve', 'smooth');
  const [selectedProvider, setSelectedProvider] = usePersistedSetting('ai_provider', '');
  const [selectedModel, setSelectedModel] = usePersistedSetting('ai_model', '');

  // Flow management state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoadedFlow, setIsLoadedFlow] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  // Storage id of the currently open flow (loaded or saved) - lets Save
  // update in place instead of always duplicating
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  // Blank-canvas editing mode: visualization without any AI analysis
  
  // Toast notification state
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('info');

  // Add browser refresh protection for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // URL change handler with validation
  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    
    // Clear error when user starts typing
    if (urlError) {
      setUrlError(false);
      setUrlHelperText('');
    }
    
    // Validate URL when there's content
    if (newUrl.trim()) {
      if (!isValidUrl(newUrl)) {
        setUrlError(true);
        setUrlHelperText('Please enter a valid URL (e.g., https://example.com/article)');
      }
    }
  };


  // Toast notification helper
  const showToast = (message: string, severity: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    setToastMessage(message);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  // Clear all form and content state
  const clearAllState = () => {
    setUrl('');
    setTextContent('');
    setSubmittedUrl('');
    setSubmittedText('');
    setIsSearchExpanded(false);
    setExportFunction(null);
    setUrlError(false);
    setUrlHelperText('');
    setLoadedFlow(undefined);
    setHasUnsavedChanges(false);
    setIsLoadedFlow(false);
    setCurrentFlowId(null);
    // Otherwise a stale request would re-fire the moment the canvas remounts.
    setAnalysisRequest(null);

    if (clearVisualization) {
      clearVisualization();
    }
  };

  return {
    // Core state
    url,
    submittedUrl,
    textContent,
    submittedText,
    inputMode,
    showError,
    isSearchExpanded,
    urlError,
    urlHelperText,
    exportFunction,
    clearVisualization,
    getSaveData,
    loadedFlow,
    
    // Dialog states
    analysisRequest,
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
    isLoadedFlow,
    isStreaming,
    currentFlowId,
    
    // Toast
    toastOpen,
    toastMessage,
    toastSeverity,
    
    // Setters
    setUrl,
    setSubmittedUrl,
    setTextContent,
    setSubmittedText,
    setInputMode,
    setShowError,
    setIsSearchExpanded,
    setUrlError,
    setUrlHelperText,
    setExportFunction,
    setClearVisualization,
    setGetSaveData,
    setLoadedFlow,
    setAnalysisRequest,
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
    setToastMessage,
    setToastSeverity,

    // Handlers
    handleUrlChange,
    showToast,
    clearAllState,
  };
};