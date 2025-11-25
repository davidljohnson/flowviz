import { useState, useEffect } from 'react';

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
  const [inputMode, setInputMode] = useState<'url' | 'text'>('url');
  
  // UI state
  const [showError, setShowError] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [urlError, setUrlError] = useState(false);
  const [urlHelperText, setUrlHelperText] = useState('');
  
  // Content and visualization state
  const [articleContent, setArticleContent] = useState<any>(null);
  const [exportFunction, setExportFunction] = useState<((format: 'png' | 'json' | 'afb' | 'flowviz') => void) | null>(null);
  const [clearVisualization, setClearVisualization] = useState<(() => void) | null>(null);
  const [storyModeData, setStoryModeData] = useState<any>(null);
  const [getSaveData, setGetSaveData] = useState<(() => { nodes: any[], edges: any[], viewport: any }) | null>(null);
  const [loadedFlow, setLoadedFlow] = useState<{ nodes: any[], edges: any[], viewport?: any } | undefined>(undefined);
  
  // Dialog states
  const [newSearchDialogOpen, setNewSearchDialogOpen] = useState(false);
  const [saveFlowDialogOpen, setSaveFlowDialogOpen] = useState(false);
  const [loadFlowDialogOpen, setLoadFlowDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  
  // Settings state with loading state to prevent flash of default values
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [cinematicMode, setCinematicMode] = useState(true);
  const [edgeColor, setEdgeColor] = useState('default');
  const [edgeStyle, setEdgeStyle] = useState('solid');
  const [edgeCurve, setEdgeCurve] = useState('smooth');
  const [storyModeSpeed, setStoryModeSpeed] = useState(3); // seconds, range 1-10
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  
  // Initialize settings from localStorage after mount
  useEffect(() => {
    const storedCinematic = localStorage.getItem('cinematic_mode');
    if (storedCinematic !== null) {
      setCinematicMode(storedCinematic === 'true');
    }

    const storedEdgeColor = localStorage.getItem('edge_color');
    if (storedEdgeColor) {
      setEdgeColor(storedEdgeColor);
    }

    const storedEdgeStyle = localStorage.getItem('edge_style');
    if (storedEdgeStyle) {
      setEdgeStyle(storedEdgeStyle);
    }

    const storedEdgeCurve = localStorage.getItem('edge_curve');
    if (storedEdgeCurve) {
      setEdgeCurve(storedEdgeCurve);
    }

    const storedStorySpeed = localStorage.getItem('story_mode_speed');
    if (storedStorySpeed) {
      setStoryModeSpeed(parseInt(storedStorySpeed, 10));
    }

    const storedProvider = localStorage.getItem('ai_provider');
    if (storedProvider) {
      setSelectedProvider(storedProvider);
    }

    const storedModel = localStorage.getItem('ai_model');
    if (storedModel) {
      setSelectedModel(storedModel);
    }

    setSettingsLoaded(true);
  }, []);
  
  // Flow management state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoadedFlow, setIsLoadedFlow] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Toast notification state
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('info');

  // Add browser refresh protection for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isLoadedFlow) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, isLoadedFlow]);

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

  // Settings save handler
  const handleSaveSettings = (newSettings?: {
    cinematicMode: boolean;
    edgeColor: string;
    edgeStyle: string;
    edgeCurve: string;
    storyModeSpeed: number;
    selectedProvider: string;
    selectedModel: string;
  }) => {
    // Use provided settings or current state values
    const settingsToSave = newSettings || {
      cinematicMode,
      edgeColor,
      edgeStyle,
      edgeCurve,
      storyModeSpeed,
      selectedProvider,
      selectedModel,
    };

    // Save to localStorage
    localStorage.setItem('cinematic_mode', settingsToSave.cinematicMode.toString());
    localStorage.setItem('edge_color', settingsToSave.edgeColor);
    localStorage.setItem('edge_style', settingsToSave.edgeStyle);
    localStorage.setItem('edge_curve', settingsToSave.edgeCurve);
    localStorage.setItem('story_mode_speed', settingsToSave.storyModeSpeed.toString());
    localStorage.setItem('ai_provider', settingsToSave.selectedProvider);
    localStorage.setItem('ai_model', settingsToSave.selectedModel);

    showToast('Settings saved successfully', 'success');
    setSettingsDialogOpen(false);
  };

  // Clear all form and content state
  const clearAllState = () => {
    setUrl('');
    setTextContent('');
    setSubmittedUrl('');
    setSubmittedText('');
    setIsSearchExpanded(false);
    setArticleContent(null);
    setExportFunction(null);
    setStoryModeData(null);
    setUrlError(false);
    setUrlHelperText('');
    setLoadedFlow(undefined);
    setHasUnsavedChanges(false);
    setIsLoadedFlow(false);
    
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
    articleContent,
    exportFunction,
    clearVisualization,
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
    selectedProvider,
    selectedModel,

    // Flow management
    hasUnsavedChanges,
    isLoadedFlow,
    isStreaming,
    
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
    setSelectedProvider,
    setSelectedModel,
    setHasUnsavedChanges,
    setIsLoadedFlow,
    setIsStreaming,
    setToastOpen,
    setToastMessage,
    setToastSeverity,

    // Handlers
    handleUrlChange,
    showToast,
    handleSaveSettings,
    clearAllState,
  };
};