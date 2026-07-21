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
  ConnectionMode
} from 'reactflow';
import { toPng } from 'html-to-image';
import { STIXBundleExporter } from '../../flow-export/services/stixBundleExporter';
import { AttackFlowV3Exporter } from '../../flow-export/services/attackFlowV3Exporter';
import { SavedFlow } from '../../flow-storage/types/SavedFlow';
import 'reactflow/dist/style.css';
import { Box } from '@mui/material';
import ErrorBoundary from '../../../shared/components/ErrorBoundary';

import { THEME, NODE_TYPES, MERGE_CLUSTER_GAP } from './constants';
import { StreamingDirectFlowClient } from '../services/streamingDirectFlowClient';
import { getLayoutedElements, boundsOf, type Bounds } from './utils/layoutUtils';

import FloatingConnectionLine from './edges/FloatingConnectionLine';
import FloatingEdge from './edges/FloatingEdge';
import { useStoryMode } from './hooks/useStoryMode';
import LoadingIndicator from '../../../shared/components/LoadingIndicator';
import { useFlowEditor, useEditorKeyboard, EdgeLabelEditor, CommandPalette } from '../../flow-editing';
import type { Command } from '../../flow-editing';
import type { EdgeLabelEditorState } from '../../flow-editing';
import { EdgeActionsProvider } from '../../flow-editing/context/EdgeActionsContext';
import NodeInspector from '../../flow-editing/components/NodeInspector';
import EdgeInspector from '../../flow-editing/components/EdgeInspector';
import EmptyCanvasState from '../../flow-editing/components/EmptyCanvasState';
import NodeTypePickerMenu, { NodePickerState } from '../../flow-editing/components/NodeTypePickerMenu';
import { EditorNodeType } from '../../flow-editing/utils/nodeFactoryDefaults';
import type { AnalysisRequest } from '../types/analysisRequest';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import GridOnIcon from '@mui/icons-material/GridOn';
import GridOffIcon from '@mui/icons-material/GridOff';
// Dot-pattern glyphs, so showing the dots doesn't wear the same icon as
// snapping to them — they're independent settings.
import BlurOnIcon from '@mui/icons-material/BlurOn';
import BlurOffIcon from '@mui/icons-material/BlurOff';
import AddIcon from '@mui/icons-material/Add';
import CropFreeIcon from '@mui/icons-material/CropFree';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';

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
  /** `mode` lets the host keep the canvas mounted when a merge fails. */
  onError?: (error: Error, mode?: 'merge' | 'replace') => void;
  onContentChanged?: () => void;
  edgeColor?: string;
  edgeStyle?: string;
  edgeCurve?: string;
  storyModeSpeed?: number;
  /**
   * What actually starts a stream. `url` is still used for provenance on
   * export and to pick the loading copy, but it no longer triggers analysis —
   * see AnalysisRequest for why the trigger had to become an explicit value.
   */
  analysisRequest?: AnalysisRequest | null;
  /** Opens the Analyse dialog from the empty-canvas guidance. */
  onAnalyzeRequested?: () => void;
  /** Asks the host to empty the canvas (it owns the unsaved-changes prompt). */
  onClearRequested?: () => void;
}

const StreamingFlowVisualizationContent: React.FC<StreamingFlowVisualizationProps> = ({
  url,
  analysisRequest,
  onAnalyzeRequested,
  onClearRequested,
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
  edgeColor = 'default',
  edgeStyle = 'solid',
  edgeCurve = 'smooth',
  storyModeSpeed = 3,
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

  // The request currently being streamed. Every callback checks this before
  // touching state: the client keeps reading (and can keep emitting nodes)
  // after a mid-stream server error, so without it a superseded or failed run
  // could write onto the canvas belonging to a newer one.
  const activeRequestIdRef = useRef<string | null>(null);
  // Requests already started, so a re-render can't restart the same one.
  const startedRequestIdRef = useRef<string | null>(null);

  // Merge bookkeeping. `preservedIds` is what was on the canvas when the merge
  // began — those nodes are excluded from layout entirely so they keep the
  // positions the user gave them. `preservedBounds` is captured once and stays
  // frozen (preserved nodes never move), giving the incoming cluster a stable
  // anchor to sit below while it grows.
  const preservedIdsRef = useRef<Set<string>>(new Set());
  const preservedBoundsRef = useRef<Bounds | null>(null);
  const newNodeIdsRef = useRef<Set<string>>(new Set());

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
      // Opaque so the edge line (which runs under the arrow body, since the
      // marker's tip sits at the path end) doesn't show through it. The shade
      // roughly matches the translucent line's rendered appearance.
      type: MarkerType.ArrowClosed,
      width: 15,
      height: 15,
      color: 'rgb(150, 153, 158)',
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

  // Grid dots, on by default and persisted like the snap choice. Independent of
  // snapping: hiding the dots keeps nodes landing on the same 20px lattice, it
  // just stops drawing it — useful for a clean export or a dense flow.
  const [gridVisible, setGridVisible] = useState(() => {
    const stored = localStorage.getItem('flowviz_show_grid');
    return stored === null ? true : stored === 'true';
  });
  const toggleGrid = useCallback(() => {
    setGridVisible(prev => {
      const next = !prev;
      localStorage.setItem('flowviz_show_grid', String(next));
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
  // Selected edge drives the edge inspector; only one inspector shows at a time.
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const openInspector = useCallback((nodeId: string, focusName = false) => {
    if (isStreamingRef.current) return;
    setSelectedEdgeId(null);
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

  const handleEdgeClick = useCallback((_event: React.MouseEvent, edge: any) => {
    if (isStreamingRef.current) return;
    setInspectorNodeId(null);
    setInspectorFocusName(false);
    setSelectedEdgeId(edge.id);
  }, []);

  const handlePaneClick = useCallback(() => {
    closeInspector();
    setSelectedEdgeId(null);
  }, [closeInspector]);

  // Live node backing the inspector; unmounts if the node is deleted
  const inspectorNode = useMemo(
    () => (inspectorNodeId ? nodes.find(n => n.id === inspectorNodeId) ?? null : null),
    [inspectorNodeId, nodes]
  );

  // Live edge backing the edge inspector (+ its endpoint node labels)
  const selectedEdge = useMemo(
    () => (selectedEdgeId ? edges.find(e => e.id === selectedEdgeId) ?? null : null),
    [selectedEdgeId, edges]
  );
  const nodeLabel = useCallback((nodeId: string) => {
    const n = nodes.find(x => x.id === nodeId);
    return (n?.data?.name as string) || (n?.data?.type as string) || 'Node';
  }, [nodes]);

  // Add-node flows: drag-from-handle onto the pane, or toolbar Add button
  const [nodePicker, setNodePicker] = useState<NodePickerState | null>(null);
  const connectStartRef = useRef<{ nodeId: string; handleType: 'source' | 'target' } | null>(null);

  const handleConnectStart = useCallback((_event: any, params: { nodeId: string | null; handleType: string | null }) => {
    connectStartRef.current = params.nodeId
      ? { nodeId: params.nodeId, handleType: (params.handleType as 'source' | 'target') ?? 'source' }
      : null;
  }, []);

  // Edge direction follows the drag: the node you started dragging from is the
  // source, so the arrow points at the node you dropped on — regardless of
  // which side's handle you grabbed. (In loose connection mode ReactFlow would
  // otherwise pick source/target by handle type, flipping top/left drags.)
  const handleConnect = useCallback((connection: { source: string | null; target: string | null }) => {
    const startId = connectStartRef.current?.nodeId;
    let { source, target } = connection;
    if (startId && target === startId && source) {
      [source, target] = [target, source];
    }
    editor.connect({ source, target });
  }, [editor.connect]);

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

  /**
   * Open the node picker for a node landing at the centre of the current view.
   * `anchor` is where the menu itself appears — the click point when there was
   * one, the view centre when invoked from the keyboard.
   */
  const openNodePicker = useCallback((anchor?: { x: number; y: number }) => {
    const container = document.querySelector('.flow-visualization-container');
    const rect = container?.getBoundingClientRect();
    const centerX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const centerY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const flowPosition = reactFlowInstance.screenToFlowPosition({ x: centerX, y: centerY });
    setNodePicker({ x: anchor?.x ?? centerX, y: anchor?.y ?? centerY, flowPosition });
  }, [reactFlowInstance]);

  const handleAddNodeFromToolbar = useCallback((event: React.MouseEvent<HTMLElement>) => {
    openNodePicker({ x: event.clientX, y: event.clientY });
  }, [openNodePicker]);

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

  const [paletteOpen, setPaletteOpen] = useState(false);

  useEditorKeyboard({
    // Also off while the palette is up: its own list handles the arrow keys,
    // and Delete/Backspace would otherwise still reach the canvas behind it.
    enabled: !isStreaming && !paletteOpen,
    onUndo: editor.undo,
    onRedo: editor.redo,
    onDelete: editor.deleteSelection,
    canAddChild: Boolean(inspectorNode),
    onAddChild: handleAddChildFromSelection,
  });

  // ⌘K / Ctrl+K. Registered separately from useEditorKeyboard because it stays
  // live while streaming — analysing is exactly what you might want next.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.code !== 'KeyK') return;
      event.preventDefault();
      setPaletteOpen(prev => !prev);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const commands = useMemo<Command[]>(() => [
    {
      id: 'analyze',
      label: 'Analyze a report…',
      keywords: 'url text pdf article import threat intel merge',
      icon: AutoAwesomeIcon,
      disabled: !onAnalyzeRequested,
      run: () => onAnalyzeRequested?.(),
    },
    {
      id: 'add-node',
      label: 'Add a node…',
      keywords: 'new technique tool malware asset create',
      icon: AddIcon,
      disabled: isStreaming,
      run: () => openNodePicker(),
    },
    {
      id: 'clear-canvas',
      label: 'Clear canvas',
      keywords: 'empty reset start over new delete all',
      icon: DeleteSweepIcon,
      disabled: isStreaming || !onClearRequested,
      // The host owns this: it holds the unsaved-changes prompt and the
      // save/loaded-flow bookkeeping that has to be reset alongside the nodes.
      run: () => onClearRequested?.(),
    },
    {
      id: 'relayout',
      label: 'Clean up layout',
      keywords: 'tidy arrange dagre auto',
      icon: AutoFixHighIcon,
      disabled: isStreaming,
      run: () => editor.relayout(),
    },
    {
      id: 'fit-view',
      label: 'Fit view',
      keywords: 'zoom center show all',
      icon: CropFreeIcon,
      run: () => reactFlowInstance?.fitView({ padding: 0.15, duration: 600 }),
    },
    {
      id: 'toggle-grid',
      label: gridVisible ? 'Hide grid dots' : 'Show grid dots',
      hint: gridVisible ? 'On' : 'Off',
      keywords: 'background dots grid',
      icon: gridVisible ? BlurOnIcon : BlurOffIcon,
      run: toggleGrid,
    },
  ], [onAnalyzeRequested, onClearRequested, isStreaming, openNodePicker, editor, reactFlowInstance, gridVisible, toggleGrid]);

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
    if (!analysisRequest) return;
    // One start per request id. Previously the guard was a client ref that only
    // ever cleared on a full canvas reset, which is why a second analysis was
    // impossible; and `loadedFlow` was in the guard too, so a blank canvas
    // (which sets an empty loadedFlow) could never analyse at all.
    if (startedRequestIdRef.current === analysisRequest.id) return;
    if (isStreamingRef.current) return;

    const request = analysisRequest;
    startedRequestIdRef.current = request.id;
    activeRequestIdRef.current = request.id;

    const startStreaming = async () => {
      newNodeIdsRef.current = new Set();

      if (request.mode === 'replace') {
        setNodes([]);
        setEdges([]);
        preservedIdsRef.current = new Set();
        preservedBoundsRef.current = null;
      } else {
        // Freeze what's already here. Read from the ref rather than `nodes` so
        // this is the state at the moment the merge starts, not a render ago.
        const existing = nodesRef.current;
        preservedIdsRef.current = new Set(existing.map(n => n.id));
        preservedBoundsRef.current = boundsOf(existing);
        // Snapshot for undo, and for putting the canvas back if this fails.
        editor.beginBatch();
      }

      setIsStreaming(true);
      setShowLoadingIndicator(true); // Show loading indicator when starting
      onStreamingStart?.(); // Notify parent that streaming has started
      
      console.log('🚀 Starting streaming direct flow extraction...');
      
      streamingClientRef.current = new StreamingDirectFlowClient();

      // Namespace this run's ids off the request id. Applied to every analysis,
      // not just merges, so a flow saved today can't collide with one analysed
      // tomorrow.
      const runId = request.id.slice(0, 8);
      const isStale = () => activeRequestIdRef.current !== request.id;

      await streamingClientRef.current.extractDirectFlowStreaming(request.input, {
        onProgress: (stage, message) => {
          if (isStale()) return;
          onProgress?.(stage, message);
        },

        onNode: (node) => {
          if (isStale()) return;
          newNodeIdsRef.current.add(node.id);
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
          if (isStale()) return;
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
          if (isStale()) return;
          activeRequestIdRef.current = null;
          streamingClientRef.current = null;
          console.log('✅ Streaming completed');
          setIsStreaming(false);
          setShowLoadingIndicator(false); // Hide loading indicator on complete
          onStreamingEnd?.(); // Notify parent that streaming has ended
          
          // Clean up nodes and edges - remove any streaming artifacts. Scoped to
          // this run's nodes: on a merge the rest of the canvas is the user's,
          // and clearing its styles and selection would be a side effect of
          // analysing something else.
          const isMergeRun = preservedIdsRef.current.size > 0;
          const arrived = newNodeIdsRef.current;
          const isFromThisRun = (id: string) => !isMergeRun || arrived.has(id);

          setTimeout(() => {
            setNodes((currentNodes) =>
              currentNodes.map(node => isFromThisRun(node.id) ? ({
                ...node,
                style: undefined, // Remove any inline styles
                dragging: false,
                selected: false,
              }) : node)
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
                  // Never prune an edge the user drew or that belongs to an
                  // earlier analysis — only this run's own duplicates.
                  if (!isFromThisRun(e.source) || !isFromThisRun(e.target)) return true;
                  const ops = feedsOperators.get(e.source);
                  const isBypass = ops?.some(op => operatorTargets.get(op)?.has(e.target));
                  return !isBypass;
                })
                .map(edge => ({
                  ...edge,
                  className: undefined,
                }));
            });

            if (isMergeRun) {
              // The merge arrived on top of work the user may want back, so it
              // becomes one undo entry rather than wiping their history.
              editor.endBatch('Analyze report');
            } else {
              // The cleaned-up graph is the undo baseline: nothing from the
              // streaming pipeline itself should be undoable
              editor.resetHistory();
            }
          }, 100);
          
          setTimeout(() => {
            if (!reactFlowInstance) return;
            if (isMergeRun) {
              // Frame what just arrived rather than refitting the whole board,
              // which would zoom out on every merge until nothing is readable.
              const merged = nodesRef.current.filter(n => arrived.has(n.id));
              const b = boundsOf(merged);
              if (b) {
                reactFlowInstance.fitBounds(
                  { x: b.minX, y: b.minY, width: b.maxX - b.minX, height: b.maxY - b.minY },
                  { padding: 0.2, duration: 800 }
                );
                return;
              }
            }
            reactFlowInstance.fitView({
              padding: 0.15,
              duration: 800,
              maxZoom: 1.5,
              minZoom: 0.1
            });
          }, 600);
        },
        
        onError: (err) => {
          if (isStale()) return;
          // Stop accepting this run's output. The client does not return after
          // reporting an error, so it can keep emitting nodes past this point —
          // this is what makes the rollback below stick.
          activeRequestIdRef.current = null;
          streamingClientRef.current = null;
          console.error('❌ Streaming error:', err);

          if (request.mode === 'merge') {
            // Put the canvas back rather than stranding half a report on top of
            // the user's flow.
            editor.abortBatch();
            preservedIdsRef.current = new Set();
            preservedBoundsRef.current = null;
            newNodeIdsRef.current = new Set();
          }

          setIsStreaming(false);
          setShowLoadingIndicator(false); // Hide loading indicator on error
          onStreamingEnd?.(); // Notify parent that streaming has ended (even on error)
          onError?.(err, request.mode); // Pass error to parent for snackbar display
        }
      }, {
        provider: request.provider,
        model: request.model,
        idPrefix: runId
      });
    };

    startStreaming();
    // Only the request drives this. Provider and model ride along inside it, so
    // changing the model in Settings no longer re-triggers a running analysis.
  }, [analysisRequest]);

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
      const preserved = preservedIdsRef.current;
      const isMerge = preserved.size > 0;

      // Lay out only what this run brought in. Passing the whole graph would
      // rewrite every position — Dagre has no concept of a pinned node — and
      // chainOrphans would additionally weld the incoming nodes onto the tail
      // of the existing ones, collapsing both flows into a single chain.
      const newNodes = isMerge ? nodes.filter(n => !preserved.has(n.id)) : nodes;
      if (newNodes.length === 0) {
        setNeedsLayout(false);
        return;
      }
      const newIds = new Set(newNodes.map(n => n.id));
      const newEdges = isMerge
        ? edges.filter(e => newIds.has(e.source) && newIds.has(e.target))
        : edges;

      console.log(`🎨 Applying layout to ${newNodes.length} nodes, ${newEdges.length} edges${isMerge ? ' (merge)' : ''}`);
      // Apply Dagre layout, chaining not-yet-connected nodes so streamed nodes
      // cascade top-to-bottom instead of spreading into one horizontal rank
      let laid = getLayoutedElements(newNodes, newEdges, { chainOrphans: true }).nodes;

      if (isMerge && preservedBoundsRef.current) {
        const pb = preservedBoundsRef.current;
        const nb = boundsOf(laid);
        if (nb) {
          // Anchor the cluster's TOP edge a fixed distance below the existing
          // flow, and centre it horizontally. Anchoring the centre instead
          // would make the whole cluster creep upward as it grows, since Dagre
          // re-lays it from scratch on every streamed node.
          const dx = (pb.minX + pb.maxX) / 2 - (nb.minX + nb.maxX) / 2;
          const dy = (pb.maxY + MERGE_CLUSTER_GAP) - nb.minY;
          laid = laid.map(n => ({ ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }));
        }
      }

      // Update nodes with new positions and make them visible.
      // Nodes that were already visible glide to their new position; nodes being
      // revealed for the first time only fade in (no slide from the origin).
      const laidById = new Map(laid.map(n => [n.id, n]));

      // Map over the previous array rather than replacing it wholesale, so
      // preserved nodes keep both their position and their object identity —
      // history entries share node objects by reference, and ReactFlow's
      // measured dimensions live on them.
      setNodes(prev => prev.map(n => {
        const l = laidById.get(n.id);
        if (!l) return n;
        const wasVisible = (n.style as React.CSSProperties | undefined)?.opacity === 1;
        return {
          ...l,
          style: {
            opacity: 1,
            transition: wasVisible
              ? 'opacity 0.5s ease-in-out, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
              : 'opacity 0.5s ease-in-out'
          }
        };
      }));
      // Don't override edges here - they are managed by the streaming callbacks

      // Keep the view centered on the graph during streaming. Suppressed on a
      // merge: the user is looking at their existing flow, and re-framing every
      // ~100ms as the new cluster grows would drag it out from under them.
      if (reactFlowInstance && !isMerge) {
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
      // A PNG export is a picture of the flow, not a screenshot of the app.
      // It captures `.react-flow__viewport` — the transformed content layer —
      // so the inspector, the controls and the editing toolbar are all outside
      // the captured subtree by construction and need no hiding. (An earlier
      // version special-cased "a node is selected" by capturing the whole
      // container instead, which baked the inspector panel and every toolbar
      // into the image at whatever zoom the user happened to be at.)
      if (nodes.length === 0) {
        console.error('No nodes to export');
        return;
      }

      const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewportElement) {
        console.error('ReactFlow viewport not found');
        return;
      }

      // Bounds from the layout sizes, not ReactFlow's `getNodesBounds`: with
      // onlyRenderVisibleElements on, an offscreen node has no measured size,
      // so getNodesBounds would frame only what the user had scrolled past.
      const b = boundsOf(nodes);
      if (!b) return;
      const flowWidth = b.maxX - b.minX;
      const flowHeight = b.maxY - b.minY;

      // Render at 2x for a crisp image, backing off if that would exceed what
      // canvas can allocate. Browsers cap a single dimension near 16384 device
      // pixels and the total area well before that, and a canvas over either
      // limit fails by producing a blank image rather than by throwing.
      const PIXEL_RATIO = 2;
      const PAD = 48; // export pixels, applied after zoom
      const MAX_SIDE = 16384 / PIXEL_RATIO;
      const MAX_AREA = 40_000_000 / (PIXEL_RATIO * PIXEL_RATIO);

      let zoom = 2;
      zoom = Math.min(zoom, (MAX_SIDE - PAD * 2) / flowWidth, (MAX_SIDE - PAD * 2) / flowHeight);
      zoom = Math.min(zoom, Math.sqrt(MAX_AREA / (flowWidth * flowHeight)));
      zoom = Math.max(zoom, 0.1);

      const imageWidth = Math.round(flowWidth * zoom + PAD * 2);
      const imageHeight = Math.round(flowHeight * zoom + PAD * 2);

      // Place the top-left of the bounding box at (PAD, PAD) in the image.
      const tx = PAD - b.minX * zoom;
      const ty = PAD - b.minY * zoom;

      // onlyRenderVisibleElements culls against the live viewport, so nodes
      // that have never been on screen are absent from the DOM. fitView brings
      // every node into view — and therefore into the DOM — before capture; the
      // export transform is then applied to the clone by html-to-image, which
      // leaves the culling that already ran untouched.
      const currentViewport = reactFlowInstance.getViewport();
      reactFlowInstance.fitView({ padding: 0.1, duration: 0 });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      try {
        const dataUrl = await toPng(viewportElement, {
          backgroundColor: '#0d1117',
          width: imageWidth,
          height: imageHeight,
          pixelRatio: PIXEL_RATIO,
          style: {
            width: `${imageWidth}px`,
            height: `${imageHeight}px`,
            transform: `translate(${tx}px, ${ty}px) scale(${zoom})`,
            transformOrigin: 'top left',
          },
        });

        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = dataUrl;
        link.click();
      } catch (error) {
        console.error('Error exporting to PNG:', error);
      } finally {
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
  }, [nodes, edges, reactFlowInstance, contentType, url]);

  const handleClear = useCallback(() => {
    console.log('🧹 Clearing streaming visualization');
    setNodes([]);
    setEdges([]);
    setIsStreaming(false);
    editor.resetHistory();

    // Reset streaming client and disown any in-flight run, so its callbacks
    // can't write onto the freshly cleared canvas.
    streamingClientRef.current = null;
    activeRequestIdRef.current = null;
    startedRequestIdRef.current = null;
    preservedIdsRef.current = new Set();
    preservedBoundsRef.current = null;
    newNodeIdsRef.current = new Set();
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
        // Take whatever the app bar leaves, rather than subtracting an assumed
        // 64px: at fractional display scaling the bar renders ~64.67px, so the
        // arithmetic overshot the viewport by a sub-pixel and left a permanent
        // scrollbar. minHeight:0 lets this flex item shrink below its content,
        // and its used height stays definite, so ReactFlow's height:100% still
        // resolves and fills the canvas.
        flex: 1,
        minHeight: 0,
        backgroundColor: THEME.background.primary,
        position: 'relative'
      }}
    >
      {/* Story-mode vignette: fades the canvas edges during playback. */}
      {storyState.steps.length > 0 && (
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
          onConnect={handleConnect}
          onConnectStart={handleConnectStart}
          onConnectEnd={handleConnectEnd}
          onEdgeClick={handleEdgeClick}
          onEdgeDoubleClick={handleEdgeDoubleClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          nodesDraggable={!isStreaming}
          nodesConnectable={!isStreaming}
          elementsSelectable={true}
          fitView={false}
          proOptions={{ hideAttribution: true }}
          connectionLineComponent={FloatingConnectionLine}
          // Snap distance when releasing a connection (default 20). Nudged up so
          // landing an edge is as forgiving as starting one — but kept modest,
          // since dropping on empty canvas is what opens the add-node picker.
          connectionRadius={28}
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
          {gridVisible && (
            <Background
              color="rgba(255, 255, 255, 0.22)"
              variant={BackgroundVariant.Dots}
              gap={GRID_SIZE}
              size={2}
            />
          )}
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
            {/* Outside the editing group: showing the dots is a view preference,
                so it stays available while a flow streams in. */}
            <ControlButton
              onClick={toggleGrid}
              title={gridVisible ? 'Grid dots: on' : 'Grid dots: off'}
            >
              {gridVisible
                ? <BlurOnIcon sx={{ fontSize: 14 }} />
                : <BlurOffIcon sx={{ fontSize: 14, opacity: 0.5 }} />}
            </ControlButton>
          </Controls>
        </ReactFlow>
        
        {/* Loading Indicator - centered in the graph during loading */}
        <LoadingIndicator isVisible={showLoadingIndicator} contentType={contentType} />

        {/* Empty-canvas guidance — only for a blank flow (no analysis pending),
            not the brief pre-stream moment of a URL/text analysis */}
        {!isStreaming && nodes.length === 0 && !url && (
          <EmptyCanvasState onAddNode={handleAddNodeFromToolbar} onAnalyze={onAnalyzeRequested} />
        )}
      </Box>

      {/* ⌘K — one way in to everything that populates the canvas */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />

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

      {/* Editable edge inspector */}
      {selectedEdge && (
        <EdgeInspector
          key={selectedEdge.id}
          edge={selectedEdge}
          sourceLabel={nodeLabel(selectedEdge.source)}
          targetLabel={nodeLabel(selectedEdge.target)}
          onUpdateLabel={editor.updateEdgeLabel}
          onUpdateEdge={editor.updateEdge}
          onReverse={editor.reverseEdge}
          onDelete={(id) => { editor.deleteEdge(id); setSelectedEdgeId(null); }}
          onClose={() => setSelectedEdgeId(null)}
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