import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  ReactFlowProvider,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
  ConnectionMode
} from 'reactflow';
import { toPng } from 'html-to-image';
import { STIXBundleExporter } from '../../flow-export/services/stixBundleExporter';
import { AttackFlowV3Exporter } from '../../flow-export/services/attackFlowV3Exporter';
import { SavedFlow } from '../../flow-storage/types/SavedFlow';
import 'reactflow/dist/style.css';
import { Box } from '@mui/material';
import ErrorBoundary from '../../../shared/components/ErrorBoundary';

import { THEME, NODE_TYPES } from './constants';
import { StreamingDirectFlowClient } from '../services/streamingDirectFlowClient';
import { getLayoutedElements } from './utils/layoutUtils';

import FloatingConnectionLine from './edges/FloatingConnectionLine';
import FloatingEdge from './edges/FloatingEdge';
import { useStoryMode } from './hooks/useStoryMode';
import LoadingIndicator from '../../../shared/components/LoadingIndicator';
import { useFlowEditor, useEditorKeyboard, EdgeLabelEditor } from '../../flow-editing';
import type { EdgeLabelEditorState } from '../../flow-editing';
import { EdgeActionsProvider } from '../../flow-editing/context/EdgeActionsContext';
import NodeInspector from '../../flow-editing/components/NodeInspector';
import EmptyCanvasState from '../../flow-editing/components/EmptyCanvasState';
import NodeTypePickerMenu, { NodePickerState } from '../../flow-editing/components/NodeTypePickerMenu';
import { EditorNodeType } from '../../flow-editing/utils/nodeFactoryDefaults';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import GridOnIcon from '@mui/icons-material/GridOn';
import GridOffIcon from '@mui/icons-material/GridOff';

// Spacing of the background dot grid; the snap-to-grid step matches it so
// dragged nodes land on the visible dots.
const GRID_SIZE = 20;

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
  onContentChanged?: () => void;
  cinematicMode?: boolean;
  edgeColor?: string;
  edgeStyle?: string;
  edgeCurve?: string;
  storyModeSpeed?: number;
  selectedProvider?: string;
  selectedModel?: string;
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
  onContentChanged,
  cinematicMode = true,
  edgeColor = 'default',
  edgeStyle = 'solid',
  edgeCurve = 'smooth',
  storyModeSpeed = 3,
  selectedProvider,
  selectedModel
}) => {
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);
  
  // Determine content type based on URL format
  const contentType = useMemo(() => {
    if (!url) return 'url';
    return url.startsWith('http://') || url.startsWith('https://') ? 'url' : 'text';
  }, [url]);
  
  // Helper function to generate edge style and type based on settings.
  // All edges use the 'floating' type, which picks connection sides from node
  // geometry (side-to-side for same-rank nodes); the curve preference travels
  // in edge data.
  const getEdgeConfig = useCallback(() => {
    const strokeColor = edgeColor === 'blue'
      ? 'rgba(59, 130, 246, 0.8)'
      : edgeColor === 'white'
        ? 'rgba(255, 255, 255, 0.8)'
        : 'rgba(255, 255, 255, 0.55)'; // default: soft monochrome
    const strokeDasharray = edgeStyle === 'dashed' ? '5 5' : undefined;

    return {
      type: 'floating',
      data: { curve: edgeCurve },
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
        data: { ...edge.data, ...edgeConfig.data },
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

  // Live view of nodes for streaming callbacks (avoids stale closures)
  const nodesRef = useRef<typeof nodes>([]);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChange(changes);
  }, [onEdgesChange]);

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

  // Snap grid matches the background dot gap so nodes land on the visible dots.
  const snapGrid = useMemo(() => [GRID_SIZE, GRID_SIZE] as [number, number], []);

  // Snap-to-grid, on by default; the choice persists across sessions.
  const [snapEnabled, setSnapEnabled] = useState(() => {
    const stored = localStorage.getItem('flowviz_snap_to_grid');
    return stored === null ? true : stored === 'true';
  });
  const toggleSnap = useCallback(() => {
    setSnapEnabled(prev => {
      const next = !prev;
      localStorage.setItem('flowviz_snap_to_grid', String(next));
      return next;
    });
  }, []);

  const reactFlowStyle = useMemo(() => ({
    backgroundColor: THEME.background.primary
  }), []);

  const nodeTypes = useMemo(() => NODE_TYPES, []);

  const edgeTypes = useMemo(() => ({ floating: FloatingEdge }), []);

  const editorFitView = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.15, duration: 600, maxZoom: 1.5, minZoom: 0.1 });
  }, [reactFlowInstance]);

  // Semantic edit operations + undo/redo. All manual graph mutations go
  // through these ops; streaming writes bypass them and reset the history
  // baseline when they settle.
  const editor = useFlowEditor({
    nodes,
    edges,
    setNodes,
    setEdges,
    isStreaming,
    getEdgeConfig,
    fitView: editorFitView,
    onContentChanged,
  });

  // Node selection drives the editable inspector. Single click selects and
  // opens it; double click (or a freshly created node) opens it with the name
  // focused for a quick rename.
  const [inspectorNodeId, setInspectorNodeId] = useState<string | null>(null);
  const [inspectorFocusName, setInspectorFocusName] = useState(false);

  const openInspector = useCallback((nodeId: string, focusName = false) => {
    if (isStreamingRef.current) return;
    setInspectorNodeId(nodeId);
    setInspectorFocusName(focusName);
  }, []);

  const closeInspector = useCallback(() => {
    setInspectorNodeId(null);
    setInspectorFocusName(false);
  }, []);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: any) => {
    openInspector(node.id, false);
  }, [openInspector]);

  const handleNodeDoubleClick = useCallback((event: React.MouseEvent, node: any) => {
    event.stopPropagation();
    openInspector(node.id, true);
  }, [openInspector]);

  const handlePaneClick = useCallback(() => {
    closeInspector();
  }, [closeInspector]);

  // Live node backing the inspector; unmounts if the node is deleted
  const inspectorNode = useMemo(
    () => (inspectorNodeId ? nodes.find(n => n.id === inspectorNodeId) ?? null : null),
    [inspectorNodeId, nodes]
  );

  // Add-node flows: drag-from-handle onto the pane, or toolbar Add button
  const [nodePicker, setNodePicker] = useState<NodePickerState | null>(null);
  const connectStartRef = useRef<{ nodeId: string; handleType: 'source' | 'target' } | null>(null);

  const handleConnectStart = useCallback((_event: any, params: { nodeId: string | null; handleType: string | null }) => {
    connectStartRef.current = params.nodeId
      ? { nodeId: params.nodeId, handleType: (params.handleType as 'source' | 'target') ?? 'source' }
      : null;
  }, []);

  const handleConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    const connectFrom = connectStartRef.current;
    connectStartRef.current = null;
    if (!connectFrom || isStreamingRef.current) return;

    // Only open the picker when the connection was dropped on empty canvas
    const target = event.target as HTMLElement | null;
    if (!target?.classList.contains('react-flow__pane')) return;

    const { clientX, clientY } =
      'changedTouches' in event ? event.changedTouches[0] : event;
    const flowPosition = reactFlowInstance.screenToFlowPosition({ x: clientX, y: clientY });
    setNodePicker({ x: clientX, y: clientY, flowPosition, connectFrom });
  }, [reactFlowInstance]);

  const handleAddNodeFromToolbar = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const { clientX, clientY } = event;
    // New nodes land at the center of the current view
    const container = document.querySelector('.flow-visualization-container');
    const rect = container?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const centerY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const flowPosition = reactFlowInstance.screenToFlowPosition({ x: centerX, y: centerY });
    setNodePicker({ x: clientX, y: clientY, flowPosition });
  }, [reactFlowInstance]);

  // Right-click empty canvas to drop a standalone node at the cursor
  const handlePaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
    if (isStreamingRef.current) return;
    event.preventDefault();
    const flowPosition = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setNodePicker({ x: event.clientX, y: event.clientY, flowPosition });
  }, [reactFlowInstance]);

  const handlePickNodeType = useCallback((type: EditorNodeType, picker: NodePickerState) => {
    setNodePicker(null);
    const newNodeId = picker.connectFrom
      ? editor.addConnectedNode(type, picker.flowPosition, picker.connectFrom)
      : editor.addNode(type, picker.flowPosition);
    // Open the inspector focused on the name so the node is immediately nameable
    if (newNodeId) {
      openInspector(newNodeId, true);
    }
  }, [editor.addConnectedNode, editor.addNode, openInspector]);

  // Keyboard-first: Tab on a selected node opens the command menu anchored below
  // it, creating a connected child (no mouse needed).
  const handleAddChildFromSelection = useCallback(() => {
    if (isStreamingRef.current || !inspectorNode) return;
    const el = document.querySelector(`.react-flow__node[data-id="${inspectorNode.id}"]`);
    const rect = el?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.bottom + 8 : window.innerHeight / 2;
    setNodePicker({
      x, y,
      flowPosition: { x: inspectorNode.position.x, y: inspectorNode.position.y + 190 },
      connectFrom: { nodeId: inspectorNode.id, handleType: 'source' },
    });
  }, [inspectorNode]);

  useEditorKeyboard({
    enabled: !isStreaming,
    onUndo: editor.undo,
    onRedo: editor.redo,
    onDelete: editor.deleteSelection,
    canAddChild: Boolean(inspectorNode),
    onAddChild: handleAddChildFromSelection,
  });

  // Edge label editing (double-click an edge)
  const [edgeLabelEdit, setEdgeLabelEdit] = useState<EdgeLabelEditorState | null>(null);

  const handleEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: any) => {
    if (isStreamingRef.current) return;
    event.stopPropagation();
    setEdgeLabelEdit({
      edgeId: edge.id,
      label: typeof edge.label === 'string' ? edge.label : '',
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  // Lets a FloatingEdge's hover "＋ Label" affordance open the same popover.
  const edgeActions = useMemo(() => ({
    onEditLabel: (edgeId: string, label: string, anchor: { x: number; y: number }) => {
      if (isStreamingRef.current) return;
      setEdgeLabelEdit({ edgeId, label, x: anchor.x, y: anchor.y });
    },
  }), []);

  // Handle loading saved flow — keyed by identity so settings changes don't
  // clobber in-progress edits by re-applying the saved snapshot
  const lastLoadedFlowRef = useRef<typeof loadedFlow>(undefined);
  useEffect(() => {
    if (loadedFlow && lastLoadedFlowRef.current !== loadedFlow) {
      lastLoadedFlowRef.current = loadedFlow;
      console.log('📂 Loading saved flow with', loadedFlow.nodes.length, 'nodes and', loadedFlow.edges.length, 'edges');
      setNodes(loadedFlow.nodes);
      
      // Apply current edge styling to loaded edges
      const edgeConfig = getEdgeConfig();
      const styledEdges = loadedFlow.edges.map(edge => ({
        ...edge,
        type: edgeConfig.type,
        data: { ...edge.data, ...edgeConfig.data },
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

      // Loaded state is the undo baseline
      editor.resetHistory();

      return; // Skip streaming if loading saved flow
    }
  }, [loadedFlow, reactFlowInstance, setNodes, setEdges, getEdgeConfig, editor.resetHistory]);

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
              data: { ...edge.data, ...edgeConfig.data },
              style: edgeConfig.style,
              className: 'fv-edge-enter' // fade-in on arrival, final style from the start
            }];
          });
        },
        
        onComplete: () => {
          console.log('✅ Streaming completed');
          setIsStreaming(false);
          setShowLoadingIndicator(false); // Hide loading indicator on complete
          onStreamingEnd?.(); // Notify parent that streaming has ended
          
          // Clean up nodes and edges - remove any streaming artifacts
          setTimeout(() => {
            setNodes((currentNodes) =>
              currentNodes.map(node => ({
                ...node,
                style: undefined, // Remove any inline styles
                dragging: false,
                selected: false,
              }))
            );

            // Drop the entrance class so culled edges don't re-fade when
            // panning brings them back into view, and remove redundant
            // operator-bypass edges: the model tends to emit A -> B alongside
            // A -> OP and OP -> B, which doubles up the drawn path
            setEdges((currentEdges) => {
              const operatorIds = new Set(
                nodesRef.current
                  .filter(n => n.type === 'AND_operator' || n.type === 'OR_operator')
                  .map(n => n.id)
              );

              const feedsOperators = new Map<string, string[]>();
              const operatorTargets = new Map<string, Set<string>>();
              currentEdges.forEach(e => {
                if (operatorIds.has(e.target)) {
                  feedsOperators.set(e.source, [...(feedsOperators.get(e.source) || []), e.target]);
                }
                if (operatorIds.has(e.source)) {
                  if (!operatorTargets.has(e.source)) {
                    operatorTargets.set(e.source, new Set());
                  }
                  operatorTargets.get(e.source)!.add(e.target);
                }
              });

              return currentEdges
                .filter(e => {
                  const ops = feedsOperators.get(e.source);
                  const isBypass = ops?.some(op => operatorTargets.get(op)?.has(e.target));
                  return !isBypass;
                })
                .map(edge => ({
                  ...edge,
                  className: undefined,
                }));
            });

            // The cleaned-up graph is the undo baseline: nothing from the
            // streaming pipeline itself should be undoable
            editor.resetHistory();
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
      // Apply Dagre layout, chaining not-yet-connected nodes so streamed nodes
      // cascade top-to-bottom instead of spreading into one horizontal rank
      const layouted = getLayoutedElements(nodes, edges, { chainOrphans: true });

      // Update nodes with new positions and make them visible.
      // Nodes that were already visible glide to their new position; nodes being
      // revealed for the first time only fade in (no slide from the origin).
      const layoutedNodesWithStyle = layouted.nodes.map(n => {
        const wasVisible = (n.style as React.CSSProperties | undefined)?.opacity === 1;
        return {
          ...n,
          style: {
            opacity: 1,
            transition: wasVisible
              ? 'opacity 0.5s ease-in-out, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
              : 'opacity 0.5s ease-in-out'
          }
        };
      });

      setNodes(layoutedNodesWithStyle);
      // Don't override edges here - they are managed by the streaming callbacks

      // Keep the view centered on the graph during streaming
      if (reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.fitView({
            padding: 0.2,
            duration: 450,
            maxZoom: 1.2,
            minZoom: 0.1
          });
        }, 50);
      }
      
      setNeedsLayout(false);
    }
  }, [needsLayout, reactFlowInstance, isStreaming]);

  // Remove mouse enter handler for better performance

  // Drag handlers coalesce a whole drag into a single undo entry
  const handleNodeDragStart = editor.beginMove;
  const handleNodeDragStop = editor.endMove;
  const handleSelectionDragStart = editor.beginMove;
  const handleSelectionDragStop = editor.endMove;

  const handleExport = useCallback(async (format: 'png' | 'json' | 'afb' | 'flowviz') => {
    const filename = `attack-flow-${Date.now()}`;

    if (format === 'png') {
      // For high-resolution PNG export, we need to capture the flow at full scale
      // not at the current zoom level

      if (inspectorNode) {
        // If a node is selected, export the container with the inspector panel
        const element = document.querySelector('.flow-visualization-container') as HTMLElement;
        if (!element) {
          console.error('Visualization container not found');
          return;
        }

        try {
          const closeButtonElement = element.querySelector('.node-details-close-button') as HTMLElement;
          const originalCloseButtonDisplay = closeButtonElement?.style.display;
          if (closeButtonElement) {
            closeButtonElement.style.display = 'none';
          }

          const dataUrl = await toPng(element, {
            backgroundColor: '#0d1117',
            pixelRatio: 2,
          });

          if (closeButtonElement) {
            closeButtonElement.style.display = originalCloseButtonDisplay || '';
          }

          const link = document.createElement('a');
          link.download = `${filename}.png`;
          link.href = dataUrl;
          link.click();
        } catch (error) {
          console.error('Error exporting to PNG:', error);
        }
        return;
      }

      // PNG export - canonical ReactFlow approach
      // Note: onlyRenderVisibleElements is enabled, so we must fitView first
      // to ensure all nodes are in the DOM before capture
      if (nodes.length === 0) {
        console.error('No nodes to export');
        return;
      }

      // 1. Get bounds of all nodes
      const nodesBounds = getNodesBounds(nodes);

      // 2. Calculate export dimensions based on content
      const padding = 50;
      const minDimension = 1500;
      const scale = Math.max(1, minDimension / Math.min(nodesBounds.width, nodesBounds.height));
      const imageWidth = Math.round((nodesBounds.width + padding * 2) * scale);
      const imageHeight = Math.round((nodesBounds.height + padding * 2) * scale);

      // 3. Get optimal viewport transform to fit all nodes
      const exportViewport = getViewportForBounds(
        nodesBounds,
        imageWidth,
        imageHeight,
        0.5,  // minZoom
        2,    // maxZoom
        padding
      );

      // 4. Get viewport element (the actual rendered content layer)
      const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewportElement) {
        console.error('ReactFlow viewport not found');
        return;
      }

      // 5. Save current viewport and fitView to ensure all nodes are rendered in DOM
      const currentViewport = reactFlowInstance.getViewport();
      reactFlowInstance.fitView({ padding: 0.1, duration: 0 });

      // Wait for React to render all nodes
      await new Promise(resolve => setTimeout(resolve, 50));

      // 6. Hide UI elements
      const reactFlowElement = document.querySelector('.react-flow') as HTMLElement;
      const controlsElement = reactFlowElement?.querySelector('.react-flow__controls') as HTMLElement;
      const attributionElement = reactFlowElement?.querySelector('.react-flow__attribution') as HTMLElement;
      const origControlsDisplay = controlsElement?.style.display;
      const origAttributionDisplay = attributionElement?.style.display;

      if (controlsElement) controlsElement.style.display = 'none';
      if (attributionElement) attributionElement.style.display = 'none';

      try {
        // 7. Capture with calculated viewport transform applied via style
        const dataUrl = await toPng(viewportElement, {
          backgroundColor: '#0d1117',
          width: imageWidth,
          height: imageHeight,
          pixelRatio: 2,
          style: {
            width: `${imageWidth}px`,
            height: `${imageHeight}px`,
            transform: `translate(${exportViewport.x}px, ${exportViewport.y}px) scale(${exportViewport.zoom})`,
          },
        });

        // 8. Download
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = dataUrl;
        link.click();
      } catch (error) {
        console.error('Error exporting to PNG:', error);
      } finally {
        // 9. Restore UI visibility and viewport
        if (controlsElement) controlsElement.style.display = origControlsDisplay || '';
        if (attributionElement) attributionElement.style.display = origAttributionDisplay || '';
        reactFlowInstance.setViewport(currentViewport);
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
  }, [nodes, edges, reactFlowInstance, contentType, url, inspectorNode]);

  const handleClear = useCallback(() => {
    console.log('🧹 Clearing streaming visualization');
    setNodes([]);
    setEdges([]);
    setIsStreaming(false);
    editor.resetHistory();

    // Reset streaming client
    if (streamingClientRef.current) {
      streamingClientRef.current = null;
    }
  }, [setNodes, setEdges, editor.resetHistory]);

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
    <EdgeActionsProvider value={edgeActions}>
    <Box
      className={`flow-visualization-container${isStreaming ? ' fv-streaming' : ''}`}
      sx={{
        width: '100%',
        // Fill exactly the space under the static 64px AppBar. A plain 100vh
        // overflowed the viewport (AppBar + 100vh) and pushed the bottom-left
        // controls below the fold. A definite height (not flex) is required so
        // the graph box / ReactFlow height:100% resolve and fill the canvas.
        height: 'calc(100vh - 64px)',
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

      {/* Node type picker (contextual +, connect-drop, right-click) */}
      <NodeTypePickerMenu
        state={nodePicker}
        onSelect={handlePickNodeType}
        onClose={() => setNodePicker(null)}
      />

      {/* Edge label editor popover */}
      <EdgeLabelEditor
        state={edgeLabelEdit}
        onCommit={editor.updateEdgeLabel}
        onClose={() => setEdgeLabelEdit(null)}
      />


      {/* React Flow Graph */}
      <Box sx={{ height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          connectionMode={ConnectionMode.Loose}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onPaneContextMenu={handlePaneContextMenu}
          onNodeDragStart={handleNodeDragStart}
          onNodeDragStop={handleNodeDragStop}
          onSelectionDragStart={handleSelectionDragStart}
          onSelectionDragStop={handleSelectionDragStop}
          onConnect={editor.connect}
          onConnectStart={handleConnectStart}
          onConnectEnd={handleConnectEnd}
          onEdgeDoubleClick={handleEdgeDoubleClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          nodesDraggable={!isStreaming}
          nodesConnectable={!isStreaming}
          elementsSelectable={true}
          fitView={false}
          proOptions={{ hideAttribution: true }}
          connectionLineComponent={FloatingConnectionLine}
          snapToGrid={snapEnabled}
          snapGrid={snapGrid}
          deleteKeyCode={null}
          multiSelectionKeyCode="Shift"
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
          zoomOnDoubleClick={false}
        >
          <Background
            color="rgba(255, 255, 255, 0.22)"
            variant={BackgroundVariant.Dots}
            gap={GRID_SIZE}
            size={2}
          />
          <Controls
            style={{
              backgroundColor: THEME.background.secondary,
              border: THEME.border.default,
              borderRadius: '8px'
            }}
          >
            {/* Editing controls live with the zoom cluster, not a floating bar */}
            {!isStreaming && (
              <>
                <ControlButton onClick={editor.undo} disabled={!editor.canUndo} title="Undo (Ctrl+Z)">
                  <UndoIcon sx={{ fontSize: 14 }} />
                </ControlButton>
                <ControlButton onClick={editor.redo} disabled={!editor.canRedo} title="Redo (Ctrl+Y)">
                  <RedoIcon sx={{ fontSize: 14 }} />
                </ControlButton>
                <ControlButton onClick={editor.relayout} title="Clean up layout">
                  <AutoFixHighIcon sx={{ fontSize: 14 }} />
                </ControlButton>
                <ControlButton
                  onClick={toggleSnap}
                  title={snapEnabled ? 'Snap to grid: on' : 'Snap to grid: off'}
                >
                  {snapEnabled
                    ? <GridOnIcon sx={{ fontSize: 14 }} />
                    : <GridOffIcon sx={{ fontSize: 14, opacity: 0.5 }} />}
                </ControlButton>
              </>
            )}
          </Controls>
        </ReactFlow>
        
        {/* Loading Indicator - centered in the graph during loading */}
        <LoadingIndicator isVisible={showLoadingIndicator} contentType={contentType} />

        {/* Empty-canvas guidance — only for a blank flow (no analysis pending),
            not the brief pre-stream moment of a URL/text analysis */}
        {!isStreaming && nodes.length === 0 && !url && (
          <EmptyCanvasState onAddNode={handleAddNodeFromToolbar} />
        )}
      </Box>

      {/* Editable node inspector */}
      {inspectorNode && (
        <NodeInspector
          key={inspectorNode.id}
          node={inspectorNode}
          focusName={inspectorFocusName}
          onChange={(patch) => editor.updateNodeData(inspectorNode.id, patch)}
          onDelete={() => { editor.deleteNode(inspectorNode.id); closeInspector(); }}
          onClose={closeInspector}
        />
      )}

    </Box>
    </EdgeActionsProvider>
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