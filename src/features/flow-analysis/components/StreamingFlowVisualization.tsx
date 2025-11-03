import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ReactFlowProvider,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow
} from 'reactflow';
import { toPng } from 'html-to-image';
import { STIXBundleExporter } from '../../flow-export/services/stixBundleExporter';
import { AttackFlowV3Exporter } from '../../flow-export/services/attackFlowV3Exporter';
import { SavedFlow } from '../../flow-storage/types/SavedFlow';
import 'reactflow/dist/style.css';
import { Box } from '@mui/material';
import ErrorBoundary from '../../../shared/components/ErrorBoundary';

import { THEME, NODE_TYPES } from './constants';
import { useNodeSelection } from './hooks/useNodeSelection';
import { StreamingDirectFlowClient } from '../services/streamingDirectFlowClient';
import { ArticleContent } from '../services/types';
import { getLayoutedElements } from './utils/layoutUtils';

import NodeDetailsPanel from './components/NodeDetailsPanel/NodeDetailsPanel';
import FloatingConnectionLine from './edges/FloatingConnectionLine';
import { useStoryMode } from './hooks/useStoryMode';
import LoadingIndicator from '../../../shared/components/LoadingIndicator';
import { useProviderConfig } from '../../app/hooks/useProviderConfig';

export interface StreamingFlowVisualizationProps {
  url: string; // Can be URL or text content
  loadedFlow?: {
    nodes: any[];
    edges: any[];
    viewport?: any;
  };
  onExportAvailable?: (exportFn: (format: 'png' | 'json' | 'afb' | 'flowviz') => void) => void;
  onClearAvailable?: (clearFn: () => void) => void;
  onStoryModeAvailable?: (storyData: {
    storyState: any;
    controls: any;
    currentStepData: any;
    onResetView: () => void;
  } | null) => void;
  onSaveAvailable?: (saveFn: (viewport?: any) => { nodes: any[], edges: any[], viewport: any }) => void;
  onStreamingStart?: () => void;
  onStreamingEnd?: () => void;
  onProgress?: (stage: string, message: string) => void;
  onError?: (error: Error) => void;
  cinematicMode?: boolean;
  edgeColor?: string;
  edgeStyle?: string;
  edgeCurve?: string;
  storyModeSpeed?: number;
}

const StreamingFlowVisualizationContent: React.FC<StreamingFlowVisualizationProps> = ({
  url,
  loadedFlow,
  onExportAvailable,
  onClearAvailable,
  onStoryModeAvailable,
  onSaveAvailable,
  onStreamingStart,
  onStreamingEnd,
  onProgress,
  onError,
  cinematicMode = true,
  edgeColor = 'default',
  edgeStyle = 'solid',
  edgeCurve = 'smooth',
  storyModeSpeed = 3
}) => {
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);

  // Get current provider/model selection
  const { selectedProvider, selectedModel } = useProviderConfig();
  
  // Determine content type based on URL format
  const contentType = useMemo(() => {
    if (!url) return 'url';
    return url.startsWith('http://') || url.startsWith('https://') ? 'url' : 'text';
  }, [url]);
  
  // Helper function to generate edge style and type based on settings
  const getEdgeConfig = useCallback(() => {
    const strokeColor = edgeColor === 'white' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(59, 130, 246, 0.8)';
    const strokeDasharray = edgeStyle === 'dashed' ? '5 5' : undefined;
    
    let type = 'default'; // smooth/curved
    if (edgeCurve === 'straight') {
      type = 'straight';
    } else if (edgeCurve === 'step') {
      type = 'step';
    }
    
    return {
      type,
      style: {
        stroke: strokeColor,
        strokeWidth: 2,
        strokeDasharray
      }
    };
  }, [edgeColor, edgeStyle, edgeCurve]);
  
  // Update existing edges when style settings change
  useEffect(() => {
    const edgeConfig = getEdgeConfig();
    setEdges((currentEdges) => 
      currentEdges.map(edge => ({
        ...edge,
        type: edgeConfig.type,
        style: edgeConfig.style
      }))
    );
  }, [getEdgeConfig, setEdges]);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingClientRef = useRef<StreamingDirectFlowClient | null>(null);
  
  // Keyboard indicator state
  const [keyIndicator, setKeyIndicator] = useState<{
    action: string;
    visible: boolean;
  } | null>(null);

  // Show keyboard indicator with animation
  const showKeyIndicator = useCallback((action: string) => {
    setKeyIndicator({ action, visible: true });
    
    // Hide after animation
    setTimeout(() => {
      setKeyIndicator(prev => prev ? { ...prev, visible: false } : null);
    }, 600);
    
    // Remove from DOM after fade out
    setTimeout(() => {
      setKeyIndicator(null);
    }, 900);
  }, []);

  // Use refs to avoid unstable dependencies
  const isStreamingRef = useRef(isStreaming);
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  const handleEdgesChange = useCallback((changes: any) => {
    if (isStreamingRef.current) {
      onEdgesChange(changes);
    }
    // After streaming: ignore all edge changes for performance
  }, [onEdgesChange]);

  const {
    selectedNode,
    handleNodeClick,
    handlePaneClick,
    closeNodeDetails
  } = useNodeSelection();

  // Story mode hook
  const {
    storyState,
    controls: storyControls,
    currentStepData
  } = useStoryMode({
    nodes,
    edges,
    reactFlowInstance,
    storyModeSpeed
  });

  // Memoize React Flow props to prevent unnecessary re-renders
  const defaultEdgeOptions = useMemo(() => ({
    type: 'default',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 15,
      height: 15,
      color: 'rgba(255, 255, 255, 0.5)',
    },
    style: {
      stroke: 'rgba(255, 255, 255, 0.5)',
      strokeWidth: 1.5,
      strokeDasharray: '4 4',
    },
    labelStyle: {
      fontSize: 11,
      fill: 'rgba(255, 255, 255, 0.7)',
      fontWeight: 500,
    },
    labelBgStyle: {
      fill: 'rgba(13, 17, 23, 0.95)',
      fillOpacity: 0.95,
    },
  }), []);

  const snapGrid = useMemo(() => [15, 15] as [number, number], []);

  const reactFlowStyle = useMemo(() => ({
    backgroundColor: THEME.background.primary
  }), []);

  const nodeTypes = useMemo(() => NODE_TYPES, []);


  // Handle loading saved flow
  useEffect(() => {
    if (loadedFlow) {
      console.log('📂 Loading saved flow with', loadedFlow.nodes.length, 'nodes and', loadedFlow.edges.length, 'edges');
      setNodes(loadedFlow.nodes);
      
      // Apply current edge styling to loaded edges
      const edgeConfig = getEdgeConfig();
      const styledEdges = loadedFlow.edges.map(edge => ({
        ...edge,
        type: edgeConfig.type,
        style: edgeConfig.style
      }));
      setEdges(styledEdges);
      
      // Restore viewport if available
      if (loadedFlow.viewport && reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.setViewport(loadedFlow.viewport);
        }, 100);
      } else if (reactFlowInstance) {
        // Fit view if no viewport data
        setTimeout(() => {
          reactFlowInstance.fitView({ duration: 800, padding: 0.1 });
        }, 100);
      }
      
      return; // Skip streaming if loading saved flow
    }
  }, [loadedFlow, reactFlowInstance, setNodes, setEdges, getEdgeConfig]);

  // Start streaming when URL is provided
  useEffect(() => {
    if (!url || isStreaming || streamingClientRef.current || loadedFlow) return;

    const startStreaming = async () => {
      setIsStreaming(true);
      setShowLoadingIndicator(true); // Show loading indicator when starting
      onStreamingStart?.(); // Notify parent that streaming has started
      
      console.log('🚀 Starting streaming direct flow extraction...');
      
      streamingClientRef.current = new StreamingDirectFlowClient();

      await streamingClientRef.current.extractDirectFlowStreaming(url, {
        onProgress: (stage, message) => {
          onProgress?.(stage, message);
        },
        
        onNode: (node) => {
          // Hide loading indicator when first node appears
          setShowLoadingIndicator(false);
          
          setNodes((prevNodes) => {
            // Add node with initial hidden state to avoid position blip
            const cleanNode = {
              ...node,
              style: {
                opacity: 0,
                transition: 'opacity 0.3s ease-in-out'
              }
            };
            const newNodes = [...prevNodes, cleanNode];
            console.log(`✨ Added node ${node.id} (${node.type}) - Total: ${newNodes.length}`);
            return newNodes;
          });
        },
        
        onEdge: (edge) => {
          setEdges((prevEdges) => {
            // Check if edge already exists to prevent duplicates
            if (prevEdges.some(e => e.id === edge.id)) {
              console.log(`⚠️ Edge already exists: ${edge.id}`);
              return prevEdges;
            }
            
            console.log(`🔗 Adding edge: ${edge.id} (${edge.source} → ${edge.target})`);
            
            const edgeConfig = getEdgeConfig();
            return [...prevEdges, {
              ...edge,
              type: edgeConfig.type,
              style: edgeConfig.style
            }];
          });
        },
        
        onComplete: () => {
          console.log('✅ Streaming completed');
          setIsStreaming(false);
          setShowLoadingIndicator(false); // Hide loading indicator on complete
          onStreamingEnd?.(); // Notify parent that streaming has ended
          
          // Clean up nodes - remove any streaming artifacts
          setTimeout(() => {
            setNodes((currentNodes) => 
              currentNodes.map(node => ({
                ...node,
                style: undefined, // Remove any inline styles
                dragging: false,
                selected: false,
              }))
            );
            
          }, 100);
          
          setTimeout(() => {
            if (reactFlowInstance) {
              reactFlowInstance.fitView({ 
                padding: 0.15, 
                duration: 800,
                maxZoom: 1.5,
                minZoom: 0.1
              });
            }
          }, 600);
        },
        
        onError: (err) => {
          console.error('❌ Streaming error:', err);
          setIsStreaming(false);
          setShowLoadingIndicator(false); // Hide loading indicator on error
          onStreamingEnd?.(); // Notify parent that streaming has ended (even on error)
          onError?.(err); // Pass error to parent for snackbar display
        }
      }, {
        provider: selectedProvider,
        model: selectedModel
      });
    };

    startStreaming();
  }, [url, selectedProvider, selectedModel]); // Depend on URL, provider, and model

  // Track when re-layout needed
  const [needsLayout, setNeedsLayout] = useState(false);
  
  // Re-layout the graph only during streaming
  useEffect(() => {
    if (!isStreaming) return; // Early exit if not streaming
    
    if (nodes.length > 0 || edges.length > 0) {
      console.log(`🎯 Layout trigger: ${nodes.length} nodes, ${edges.length} edges, streaming: ${isStreaming}`);
      // Only update layout during streaming
      const timeoutId = setTimeout(() => {
        setNeedsLayout(true);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [nodes.length, edges.length, isStreaming]);

  // Apply layout when needed - ONLY during streaming
  useEffect(() => {
    if (needsLayout && nodes.length > 0 && isStreaming) {
      console.log(`🎨 Applying layout to ${nodes.length} nodes, ${edges.length} edges`);
      // Apply Dagre layout with side-node post-processing
      const layouted = getLayoutedElements(nodes, edges);
      
      // Update nodes with new positions and make them visible
      const layoutedNodesWithStyle = layouted.nodes.map(n => ({
        ...n,
        style: {
          opacity: 1,
          transition: 'opacity 0.5s ease-in-out'
        }
      }));
      
      setNodes(layoutedNodesWithStyle);
      // Don't override edges here - they are managed by the streaming callbacks
      
      // Keep the view centered on the graph during streaming
      if (reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.fitView({ 
            padding: 0.2, 
            duration: 200,
            maxZoom: 1.2,
            minZoom: 0.1
          });
        }, 50);
      }
      
      setNeedsLayout(false);
    }
  }, [needsLayout, reactFlowInstance, isStreaming]);

  // Remove mouse enter handler for better performance

  // Memoized drag handlers with completely stable dependencies
  const handleNodeDragStart = useCallback(() => {
  }, []);

  const handleNodeDragStop = useCallback(() => {
  }, []);

  const handleSelectionDragStart = useCallback(() => {
  }, []);

  const handleSelectionDragStop = useCallback(() => {
  }, []);

  const handleExport = useCallback(async (format: 'png' | 'json' | 'afb' | 'flowviz') => {
    const filename = `attack-flow-${Date.now()}`;
    
    if (format === 'png') {
      // Export as PNG - capture the entire visualization container to include node details
      const element = selectedNode 
        ? document.querySelector('.flow-visualization-container') as HTMLElement
        : document.querySelector('.react-flow') as HTMLElement;
        
      if (!element) {
        console.error('Visualization element not found');
        return;
      }

      try {
        // Hide React Flow controls, attribution, and close button during export
        const controlsElement = element.querySelector('.react-flow__controls') as HTMLElement;
        const attributionElement = element.querySelector('.react-flow__attribution') as HTMLElement;
        const closeButtonElement = element.querySelector('.node-details-close-button') as HTMLElement;
        const originalControlsDisplay = controlsElement?.style.display;
        const originalAttributionDisplay = attributionElement?.style.display;
        const originalCloseButtonDisplay = closeButtonElement?.style.display;
        
        if (controlsElement) {
          controlsElement.style.display = 'none';
        }
        if (attributionElement) {
          attributionElement.style.display = 'none';
        }
        if (closeButtonElement) {
          closeButtonElement.style.display = 'none';
        }

        const dataUrl = await toPng(element, {
          backgroundColor: '#0d1117',
          width: element.offsetWidth,
          height: element.offsetHeight,
          style: {
            transform: 'none',
          },
        });

        // Restore controls, attribution, and close button visibility
        if (controlsElement) {
          controlsElement.style.display = originalControlsDisplay || '';
        }
        if (attributionElement) {
          attributionElement.style.display = originalAttributionDisplay || '';
        }
        if (closeButtonElement) {
          closeButtonElement.style.display = originalCloseButtonDisplay || '';
        }

        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = dataUrl;
        link.click();
      } catch (error) {
        console.error('Error exporting to PNG:', error);
        
        // Restore controls, attribution, and close button visibility even on error
        const controlsElement = element.querySelector('.react-flow__controls') as HTMLElement;
        const attributionElement = element.querySelector('.react-flow__attribution') as HTMLElement;
        const closeButtonElement = element.querySelector('.node-details-close-button') as HTMLElement;
        if (controlsElement) {
          controlsElement.style.display = '';
        }
        if (attributionElement) {
          attributionElement.style.display = '';
        }
        if (closeButtonElement) {
          closeButtonElement.style.display = '';
        }
      }
    } else if (format === 'json') {
      // Export as STIX bundle
      const exporter = new STIXBundleExporter();
      const stixBundle = exporter.exportToSTIXBundle(nodes, edges);
      
      // Add metadata
      const exportData = {
        ...stixBundle,
        x_flowviz_metadata: {
          viewport: reactFlowInstance?.getViewport(),
          exportedAt: new Date().toISOString(),
          tool: 'FlowViz',
          version: '1.0.0',
          streaming: true
        }
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.download = `${filename}-stix.json`;
      link.href = url;
      link.click();
      
      URL.revokeObjectURL(url);
    } else if (format === 'afb') {
      const v3Exporter = new AttackFlowV3Exporter();
      v3Exporter.exportToFile(nodes, edges, `${filename}.afb`);
      console.log('✅ Attack Flow V3 export completed');
    } else if (format === 'flowviz') {
      const techniques: string[] = [];
      const tactics: string[] = [];

      nodes.forEach(node => {
        if (node.data.techniques) {
          techniques.push(...node.data.techniques);
        }
        if (node.data.tactics) {
          tactics.push(...node.data.tactics);
        }
      });

      const flowVizData: SavedFlow = {
        id: crypto.randomUUID(),
        title: filename,
        sourceUrl: contentType === 'url' ? url : undefined,
        sourceText: contentType === 'text' ? url : undefined,
        inputMode: contentType,
        nodes,
        edges,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0',
          description: 'Exported from FlowViz',
          tags: [],
          nodeCount: nodes.length,
          edgeCount: edges.length,
        },
        visualization: {
          viewport: reactFlowInstance?.getViewport(),
          storyMode: { enabled: false }
        },
        analysis: {
          extractedTechniques: [...new Set(techniques)],
          extractedTactics: [...new Set(tactics)]
        }
      };

      const dataStr = JSON.stringify(flowVizData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const objectUrl = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.download = `${filename}-flowviz.json`;
      link.href = objectUrl;
      link.click();

      URL.revokeObjectURL(objectUrl);
    }
  }, [nodes, edges, reactFlowInstance, contentType, url]);

  const handleClear = useCallback(() => {
    console.log('🧹 Clearing streaming visualization');
    setNodes([]);
    setEdges([]);
    setIsStreaming(false);
    
    // Reset streaming client
    if (streamingClientRef.current) {
      streamingClientRef.current = null;
    }
  }, [setNodes, setEdges]);

  const handleGetSaveData = useCallback(() => {
    return {
      nodes: nodes,
      edges: edges,
      viewport: reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 }
    };
  }, [nodes, edges, reactFlowInstance]);

  useEffect(() => {
    if (onExportAvailable) {
      onExportAvailable(handleExport);
    }
  }, [onExportAvailable, handleExport]);

  useEffect(() => {
    if (onSaveAvailable) {
      onSaveAvailable(handleGetSaveData);
    }
  }, [onSaveAvailable, handleGetSaveData]);

  useEffect(() => {
    if (onClearAvailable) {
      onClearAvailable(handleClear);
    }
  }, [onClearAvailable, handleClear]);

  // Notify parent about story mode availability
  useEffect(() => {
    if (onStoryModeAvailable && !isStreaming && storyState.steps.length > 0) {
      onStoryModeAvailable({
        storyState,
        controls: storyControls,
        currentStepData,
        onResetView: () => {
          if (reactFlowInstance) {
            reactFlowInstance.fitView({ duration: 800, padding: 0.1 });
          }
        }
      });
    } else if (onStoryModeAvailable && (isStreaming || storyState.steps.length === 0)) {
      onStoryModeAvailable(null);
    }
  }, [onStoryModeAvailable, isStreaming, storyState, storyControls, currentStepData]);

  // Keyboard controls for story mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard shortcuts when story mode is available
      if (storyState.steps.length === 0) return;
      
      // Prevent default behavior only for specific keys
      if (event.code === 'Space' || event.code === 'ArrowLeft' || event.code === 'ArrowRight' || event.code === 'Escape') {
        // Don't interfere with typing in inputs
        const activeElement = document.activeElement;
        if (activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement).isContentEditable === true
        )) {
          return;
        }
        
        event.preventDefault();
        
        switch (event.code) {
          case 'Space':
            if (storyState.isPlaying) {
              storyControls.pauseStory();
              showKeyIndicator('Pause');
            } else {
              storyControls.playStory();
              showKeyIndicator('Play');
            }
            break;
          case 'ArrowRight':
            storyControls.nextStep();
            showKeyIndicator('Next Step');
            break;
          case 'ArrowLeft':
            storyControls.prevStep();
            showKeyIndicator('Previous Step');
            break;
          case 'Escape':
            // Stop story mode and fit view for clean overview
            storyControls.pauseStory();
            storyControls.resetStory();
            if (reactFlowInstance) {
              reactFlowInstance.fitView({ duration: 800, padding: 0.1 });
              showKeyIndicator('Fit View');
            }
            break;
        }
      }
    };

    // Add event listener to window for global keyboard handling
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [storyState, storyControls, showKeyIndicator]);

  return (
    <Box
      className="flow-visualization-container"
      sx={{
        width: '100%',
        height: '100vh',
        backgroundColor: THEME.background.primary,
        position: 'relative'
      }}
    >
      {/* Cinematic Story Mode Overlay */}
      {storyState.steps.length > 0 && cinematicMode && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 5,
            opacity: storyState.isPlaying || storyState.currentStep > 0 ? 1 : 0,
            transition: 'opacity 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {/* Top Fade */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '25%',
              background: 'linear-gradient(to bottom, rgba(13, 17, 23, 0.6) 0%, rgba(13, 17, 23, 0.3) 50%, transparent 100%)',
              backdropFilter: 'blur(1px)',
            }}
          />
          
          {/* Bottom Fade */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '25%',
              background: 'linear-gradient(to top, rgba(13, 17, 23, 0.6) 0%, rgba(13, 17, 23, 0.3) 50%, transparent 100%)',
              backdropFilter: 'blur(1px)',
            }}
          />
          
          {/* Left Fade */}
          <Box
            sx={{
              position: 'absolute',
              top: '25%',
              bottom: '25%',
              left: 0,
              width: '15%',
              background: 'linear-gradient(to right, rgba(13, 17, 23, 0.4) 0%, rgba(13, 17, 23, 0.2) 50%, transparent 100%)',
            }}
          />
          
          {/* Right Fade */}
          <Box
            sx={{
              position: 'absolute',
              top: '25%',
              bottom: '25%',
              right: 0,
              width: '15%',
              background: 'linear-gradient(to left, rgba(13, 17, 23, 0.4) 0%, rgba(13, 17, 23, 0.2) 50%, transparent 100%)',
            }}
          />
        </Box>
      )}

      {/* Floating Keyboard Indicator */}
      {keyIndicator && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            opacity: keyIndicator.visible ? 1 : 0,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: keyIndicator.visible 
              ? 'keyIndicatorIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
              : 'keyIndicatorOut 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '@keyframes keyIndicatorIn': {
              '0%': {
                opacity: 0,
                transform: 'translate(-50%, -50%) scale(0.8)',
              },
              '100%': {
                opacity: 1,
                transform: 'translate(-50%, -50%) scale(1)',
              }
            },
            '@keyframes keyIndicatorOut': {
              '0%': {
                opacity: 1,
                transform: 'translate(-50%, -50%) scale(1)',
              },
              '100%': {
                opacity: 0,
                transform: 'translate(-50%, -50%) scale(0.9)',
              }
            }
          }}
        >
          {/* Action Indicator */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 3,
              py: 1.5,
              background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
              minWidth: 80,
            }}
          >
            {keyIndicator.action}
          </Box>
        </Box>
      )}
      
      {/* React Flow Graph */}
      <Box sx={{ height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onNodeDragStart={handleNodeDragStart}
          onNodeDragStop={handleNodeDragStop}
          onSelectionDragStart={handleSelectionDragStart}
          onSelectionDragStop={handleSelectionDragStop}
          nodesDraggable={!isStreaming}
          nodesConnectable={false}
          elementsSelectable={true}
          fitView={false}
          attributionPosition="bottom-left"
          connectionLineComponent={FloatingConnectionLine}
          snapToGrid={false}
          snapGrid={snapGrid}
          deleteKeyCode={null}
          multiSelectionKeyCode={null}
          panOnDrag={true}
          selectNodesOnDrag={false}
          elevateEdgesOnSelect={false}
          defaultEdgeOptions={defaultEdgeOptions}
          style={reactFlowStyle}
          disableKeyboardA11y={true}
          onlyRenderVisibleElements={true}
          nodeOrigin={[0.5, 0.5]}
          minZoom={0.1}
          maxZoom={4}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={true}
        >
          <Background
            color="rgba(255, 255, 255, 0.1)"
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
          />
          <Controls
            style={{
              backgroundColor: THEME.background.secondary,
              border: THEME.border.default,
              borderRadius: '8px'
            }}
          />
        </ReactFlow>
        
        {/* Loading Indicator - centered in the graph during loading */}
        <LoadingIndicator isVisible={showLoadingIndicator} contentType={contentType} />
      </Box>

      {/* Node Details Panel */}      
      {selectedNode && (
        <NodeDetailsPanel
          node={selectedNode}
          onClose={closeNodeDetails}
        />
      )}

    </Box>
  );
};

const StreamingFlowVisualization: React.FC<StreamingFlowVisualizationProps> = (props) => {
  return (
    <ErrorBoundary>
      <ReactFlowProvider>
        <StreamingFlowVisualizationContent {...props} />
      </ReactFlowProvider>
    </ErrorBoundary>
  );
};

export default StreamingFlowVisualization;