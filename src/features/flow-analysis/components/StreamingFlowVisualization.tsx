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
import type { Connection, Edge, Node } from 'reactflow';
import { toPng } from 'html-to-image';
import { flushSync } from 'react-dom';
import { PresentationScaleProvider } from './nodes/shared/presentationScale';
import { STIXBundleExporter } from '../../flow-export/services/stixBundleExporter';
import { AttackFlowV3Exporter } from '../../flow-export/services/attackFlowV3Exporter';
import { SavedFlow } from '../../flow-storage/types/SavedFlow';
import 'reactflow/dist/style.css';
import { Box, IconButton, Tooltip } from '@mui/material';
import { flowVizTheme, themePalettes, currentThemeMode } from '../../../shared/theme/flowviz-theme';
import { useThemeMode } from '../../../shared/theme/ThemeModeProvider';
import ErrorBoundary from '../../../shared/components/ErrorBoundary';

import {
  THEME,
  NODE_TYPES,
  MERGE_CLUSTER_GAP,
  DECK,
  RESOLVE_MS,
  RESOLVE_STAGGER_MS,
  RESOLVE_MAX_STAGGERED_RANKS,
  READABLE_ZOOM,
  START_ZOOM_MAX,
  OVERVIEW_HOLD_MS,
  START_VIEW_MS,
} from './constants';
import { StreamingDirectFlowClient } from '../services/streamingDirectFlowClient';
import { getLayoutedElements, boundsOf, type Bounds } from './utils/layoutUtils';

import FloatingConnectionLine from './edges/FloatingConnectionLine';
import FloatingEdge from './edges/FloatingEdge';
import { resolveEdgeSides } from './edges/floatingEdgeHelpers';
import { EDGE_DASH_ARRAY, edgeColorByName } from '../../../shared/components/edgeAppearance';
import LoadingIndicator from '../../../shared/components/LoadingIndicator';
import { useFlowEditor, useEditorKeyboard, EdgeLabelEditor, CommandPalette } from '../../flow-editing';
import type { Command } from '../../flow-editing';
import type { EdgeLabelEditorState } from '../../flow-editing';
import { shortcutHint } from '../../../shared/utils/shortcuts';
import { EdgeActionsProvider } from '../../flow-editing/context/EdgeActionsContext';
import NodeInspector from '../../flow-editing/components/NodeInspector';
import EdgeInspector from '../../flow-editing/components/EdgeInspector';
import EmptyCanvasState from '../../flow-editing/components/EmptyCanvasState';
import NodeTypePickerMenu, { NodePickerState } from '../../flow-editing/components/NodeTypePickerMenu';
import SourcePanel from './components/SourcePanel';
import { normalizeSourceText } from './utils/sourceHighlight';
import { EditorNodeType } from '../../flow-editing/utils/nodeFactoryDefaults';
import { AssistantPanel, useAssistant, createOpsSession, serializeGraph, serializeContexts } from '../../flow-assistant';
import SelectionBar from '../../flow-editing/components/SelectionBar';
import type { AssistantOp, OpResult, OpsSession } from '../../flow-assistant';
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
import FlowMark from '../../../shared/components/icons/FlowMark';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AssistantMark from '../../../shared/components/icons/AssistantMark';

// Spacing of the background dot grid; the snap-to-grid step matches it so
// dragged nodes land on the visible dots.
const GRID_SIZE = 20;

/**
 * Drop edges that duplicate a route through an operator: the model tends to
 * emit A -> B alongside A -> OP and OP -> B, which draws the same path twice.
 *
 * Runs over one analysis run's own edges, before they are laid out — an edge
 * the user drew, or one from an earlier analysis, is never a candidate because
 * it is not in the buffer.
 */
const pruneOperatorBypasses = (edges: Edge[], nodes: { id: string; type?: string }[]): Edge[] => {
  const operatorIds = new Set(
    nodes.filter(n => n.type === 'AND_operator' || n.type === 'OR_operator').map(n => n.id)
  );
  if (operatorIds.size === 0) return edges;

  const feedsOperators = new Map<string, string[]>();
  const operatorTargets = new Map<string, Set<string>>();
  edges.forEach(edge => {
    if (operatorIds.has(edge.target)) {
      feedsOperators.set(edge.source, [...(feedsOperators.get(edge.source) || []), edge.target]);
    }
    if (operatorIds.has(edge.source)) {
      if (!operatorTargets.has(edge.source)) operatorTargets.set(edge.source, new Set());
      operatorTargets.get(edge.source)!.add(edge.target);
    }
  });

  return edges.filter(edge => {
    const ops = feedsOperators.get(edge.source);
    return !ops?.some(op => operatorTargets.get(op)?.has(edge.target));
  });
};

export interface StreamingFlowVisualizationProps {
  url: string; // Can be URL or text content
  loadedFlow?: {
    nodes: any[];
    edges: any[];
    viewport?: any;
    /** Original article/report text, when the saved flow kept it. */
    sourceText?: string;
    visionText?: string | null;
    /** Assistant conversation saved with the flow. */
    assistantMessages?: any[];
  };
  /** Fired when a URL analysis yields its extracted article (for saving). */
  onArticleExtracted?: (text: string, title: string) => void;
  /**
   * The vision pass's reading of this analysis's images, or null when there
   * were none to read. Hoisted for the same reason as the article: Save has to
   * persist it, or a reopened flow loses half of what its excerpts were drawn
   * from.
   */
  onVisionExtracted?: (text: string | null) => void;
  onExportAvailable?: (exportFn: (format: 'png' | 'json' | 'afb' | 'flowviz') => void) => void;
  onClearAvailable?: (clearFn: () => void) => void;
  onSaveAvailable?: (saveFn: (viewport?: any) => { nodes: any[], edges: any[], viewport: any, assistantMessages?: any[] }) => void;
  onStreamingStart?: () => void;
  onStreamingEnd?: () => void;
  onProgress?: (stage: string, message: string) => void;
  /** `mode` lets the host keep the canvas mounted when a merge fails. */
  onError?: (error: Error, mode?: 'merge' | 'replace') => void;
  onContentChanged?: () => void;
  /**
   * How many nodes are on the canvas, reported whenever that changes.
   *
   * The host can already read the graph through onSaveAvailable's getter, but
   * only by asking — and nothing tells it when to ask, because it does not
   * re-render when nodes do. Anything that has to stay in step with whether the
   * canvas is empty needs to be told, not to poll.
   */
  onNodeCountChange?: (count: number) => void;
  edgeColor?: string;
  edgeStyle?: string;
  edgeCurve?: string;
  /** Provider/model for assistant requests (same pair analysis requests use). */
  selectedProvider?: string;
  selectedModel?: string;
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
  /**
   * ⌘K entries for actions the host owns — saving, loading, exporting,
   * settings. They append to the canvas's own commands so the palette covers
   * the whole product rather than just the half of it that lives on the canvas.
   */
  hostCommands?: Command[];
  /**
   * The palette is controlled from the host because the app bar has a trigger
   * for it too, and two owners of one boolean is how a popover ends up
   * disagreeing with the control that opened it. ⌘K itself still lives here —
   * the canvas is what the palette mostly acts on.
   */
  paletteOpen: boolean;
  onPaletteOpenChange: (open: boolean) => void;
}

const StreamingFlowVisualizationContent: React.FC<StreamingFlowVisualizationProps> = ({
  url,
  analysisRequest,
  onAnalyzeRequested,
  onClearRequested,
  hostCommands,
  paletteOpen,
  onPaletteOpenChange,
  loadedFlow,
  onArticleExtracted,
  onVisionExtracted,
  onExportAvailable,
  onClearAvailable,
  onSaveAvailable,
  onStreamingStart,
  onStreamingEnd,
  onProgress,
  onError,
  onContentChanged,
  onNodeCountChange,
  edgeColor = 'default',
  edgeStyle = 'solid',
  edgeCurve = 'smooth',
  selectedProvider,
  selectedModel,
}) => {
  const reactFlowInstance = useReactFlow();

  // Non-null only while a PNG capture is in flight; see presentationScale.tsx.
  // Nodes read this instead of the live zoom so the image keeps full detail
  // regardless of how far out the viewport happens to be sitting.
  const [exportScale, setExportScale] = useState<number | null>(null);
  // Only the bits the theme can't reach through CSS variables need this —
  // arrowhead markers and the PNG canvas fill.
  const { mode } = useThemeMode();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);

  // The source material behind the canvas: pasted text at analysis start, the
  // server-extracted article for URL analyses, or a saved flow's kept text.
  // A merge of a second report overwrites it - the panel shows the latest.
  const [articleText, setArticleText] = useState<string | null>(null);
  /**
   * The vision pass's reading of the article's images — half of what a flow's
   * excerpts were drawn from, and saved with it so a reopened flow can still
   * be checked. `null` means vision did not run.
   */
  const [visionText, setVisionText] = useState<string | null>(null);
  /**
   * Whether we hold everything this flow's excerpts came from.
   *
   * False for a hand-built flow and for one saved before visionText existed:
   * there, an absent reading cannot be told apart from no reading, so the
   * excerpt check says nothing rather than calling a screenshot-derived quote
   * invented. Better to be silent than to accuse a good quote.
   */
  const [groundingKnown, setGroundingKnown] = useState(false);
  const [articleTitle, setArticleTitle] = useState<string>('');
  const [sourcePanelOpen, setSourcePanelOpen] = useState(false);
  // Launched from the bottom-right orb; the panel replaces the orb in place
  const [assistantOpen, setAssistantOpen] = useState(false);
  /**
   * Nodes/edges pinned into the assistant's context row, oldest first.
   *
   * Ids, not snapshots, so a rename shows through and a delete drops the chip —
   * `serializeContexts` resolves them against the live graph on every read.
   * They persist until removed rather than clearing per turn, so a follow-up
   * question keeps pointing at the same thing.
   */
  const [assistantContextIds, setAssistantContextIds] = useState<string[]>([]);

  /** Pin ids, ignoring any already present, and open the panel on them. */
  const addAssistantContexts = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setAssistantContextIds(prev => [...prev, ...ids.filter(id => !prev.includes(id))]);
    setAssistantOpen(true);
  }, []);

  // Pasted-text analyses and loaded text flows arrive through the url prop,
  // so fall back to it when no article event has populated the state.
  // Normalized here - the single point the panel, the excerpt highlighter,
  // and the assistant all read from, so their views of the text agree.
  const rawSourceText = articleText
    ?? (url && !url.startsWith('http://') && !url.startsWith('https://') ? url : null);
  const sourceText = useMemo(
    () => (rawSourceText ? normalizeSourceText(rawSourceText) : null),
    [rawSourceText],
  );
  
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
    // Line is translucent; the arrow is its opaque twin so the line doesn't show
    // through the arrowhead. Both must move together — colouring the line without
    // the marker leaves the previous arrow colour stranded.
    //
    // Both come from the same table the edge inspector paints its swatches from,
    // so the flow-wide default and a per-edge override of the same colour are
    // the same colour. They used not to be: blue was rgba(59,130,246,0.8) here
    // against #3b82f6 there, which also meant an edge left on the default blue
    // matched no swatch and the inspector showed nothing selected.
    //
    // `mode` is a dependency because the neutrals are read as raw values for the
    // active theme — the arrow is an SVG marker attribute and can't ride the
    // overlay token the way the line's CSS can.
    const { line: stroke, arrow } = edgeColorByName(mode, edgeColor);
    const strokeDasharray = edgeStyle === 'dashed' ? EDGE_DASH_ARRAY : undefined;

    return {
      type: 'floating',
      data: { curve: edgeCurve },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 15,
        height: 15,
        color: arrow,
      },
      style: {
        stroke,
        strokeWidth: 2,
        strokeDasharray
      }
    };
  }, [edgeColor, edgeStyle, edgeCurve, mode]);

  // Update existing edges when style settings change
  useEffect(() => {
    const edgeConfig = getEdgeConfig();
    setEdges((currentEdges) =>
      currentEdges.map(edge => ({
        ...edge,
        type: edgeConfig.type,
        data: { ...edge.data, ...edgeConfig.data },
        markerEnd: edgeConfig.markerEnd,
        style: edgeConfig.style
      }))
    );
  }, [getEdgeConfig, setEdges]);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingClientRef = useRef<StreamingDirectFlowClient | null>(null);

  /**
   * Which half of the reveal is running.
   *
   * `collecting` — cards are landing in the staging deck. Slots are fixed on
   * arrival and the camera holds still, so the only motion is a new card.
   * `resolving` — the real layout is known and every card is travelling to it.
   *
   * Culling is off for both: during collection the deck is small enough that
   * everything is on screen anyway, and during the resolve a culled card would
   * be dropped from the DOM mid-flight. It also stops entrance animations
   * replaying, which is what happened when a moving camera remounted a card
   * that had already settled.
   */
  const [revealPhase, setRevealPhase] = useState<'idle' | 'collecting' | 'resolving'>('idle');

  // Use refs to avoid unstable dependencies
  const isStreamingRef = useRef(isStreaming);
  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Settle every edge onto a pair of dots and record them, so an edge holds its
  // connection points instead of re-facing whenever a node moves.
  //
  // Two things get written. `data.pin` is what FloatingEdge draws from, and it
  // is only ever filled in ONCE per end — after that the edge is anchored and
  // this effect leaves it alone. `sourceHandle`/`targetHandle` mirror the sides
  // actually drawn: nothing renders from them, but ReactFlow places an edge's
  // (invisible) reconnect grab targets at the handles the edge names, and left
  // unset it falls back to the first handle of each type.
  //
  // Streamed and freshly loaded edges arrive with no pin, and this is where
  // they get one — from the geometry dagre gave them. Clean up layout clears
  // the pins so the new arrangement can choose afresh, and they settle again
  // here. Both nodes have to be measured first, or the sides would be resolved
  // against a fallback size and the wrong face would be the one that sticks.
  //
  // Writing straight to setEdges (not through the editor) keeps this out of
  // undo history and off the unsaved-changes flag. It is safe to skip: the pin
  // is set to the sides the edge is already drawn through, so it changes
  // nothing visually at the moment it lands.
  useEffect(() => {
    if (isStreaming) return;
    setEdges(currentEdges => {
      const byId = new Map(nodes.map(n => [n.id, n]));
      let changed = false;
      const next = currentEdges.map(edge => {
        const sourceNode = byId.get(edge.source);
        const targetNode = byId.get(edge.target);
        if (!sourceNode || !targetNode) return edge;
        if (!sourceNode.width || !targetNode.width) return edge;

        const pin = edge.data?.pin as { source?: string | null; target?: string | null } | undefined;
        const sides = resolveEdgeSides(sourceNode, targetNode, pin);
        const needsPin = !pin?.source || !pin?.target;
        const idsMatch = edge.sourceHandle === sides.source && edge.targetHandle === sides.target;
        if (idsMatch && !needsPin) return edge;

        changed = true;
        return {
          ...edge,
          sourceHandle: sides.source,
          targetHandle: sides.target,
          ...(needsPin ? { data: { ...edge.data, pin: { source: sides.source, target: sides.target } } } : {}),
        };
      });
      return changed ? next : currentEdges;
    });
    // Runs on edges too, so a freshly drawn one settles straight away rather
    // than waiting for the next node change. Returning the same array when
    // nothing moved is what stops that from looping.
  }, [nodes, edges, isStreaming, setEdges]);

  // Live view of nodes for streaming callbacks (avoids stale closures)
  const nodesRef = useRef<typeof nodes>([]);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Same for edges - assistant ops apply after an async round-trip, so they
  // must read the graph as it is then, not as it was when the request left
  const edgesRef = useRef<typeof edges>([]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

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

  // Staging deck bookkeeping: where the grid starts, how wide it is, and how
  // many slots have been handed out. Fixed for the run, so a card's slot is a
  // pure function of its arrival index and nothing already placed can move.
  const deckRef = useRef<{
    origin: { x: number; y: number };
    count: number;
    /** Radius, in cells, the camera is currently framing. */
    framedRadius: number;
  } | null>(null);
  // Edges are held back until the cards have landed. ReactFlow knows a node's
  // final position the moment it is set — only the visual transform transitions
  // — so an edge drawn during the resolve would be strung between the places
  // the cards are heading for, not the places they appear to be.
  const bufferedEdgesRef = useRef<Edge[]>([]);
  const revealTimersRef = useRef<number[]>([]);

  const clearRevealTimers = useCallback(() => {
    revealTimersRef.current.forEach(id => clearTimeout(id));
    revealTimersRef.current = [];
  }, []);

  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
  }, [onNodesChange]);

  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChange(changes);
  }, [onEdgesChange]);

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
      color: themePalettes[mode].colors.canvas.edgeArrow,
    },
    style: {
      stroke: 'rgba(var(--fv-overlay-rgb), 0.5)',
      strokeWidth: 1.5,
      strokeDasharray: '4 4',
    },
    labelStyle: {
      fontSize: 11,
      fill: 'rgba(var(--fv-overlay-rgb), 0.7)',
      fontWeight: 500,
    },
    labelBgStyle: {
      fill: 'rgba(var(--fv-panel-rgb), 0.95)',
      fillOpacity: 0.95,
    },
  }), [mode]);

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

  /**
   * Bring `target` into view at a zoom that respects `maxZoom`.
   *
   * ReactFlow's own fitBounds takes no zoom ceiling and the canvas allows 4x, so
   * framing a two-node flow through it drives the camera absurdly close. Working
   * the zoom out by hand and handing it to setCenter also means the framing is
   * computed from positions we already hold, rather than from ReactFlow's
   * internal store — which lags a setNodes by a render.
   */
  const canvasRect = useCallback(
    () => document.querySelector('.flow-visualization-container')?.getBoundingClientRect() ?? null,
    [],
  );

  /** The zoom a fit of `target` would settle on, before any ceiling is applied. */
  const fitZoomFor = useCallback((target: Bounds, padding = 0.15) => {
    const rect = canvasRect();
    if (!rect) return 1;
    const usable = 1 - padding * 2;
    return Math.min(
      (rect.width * usable) / Math.max(target.maxX - target.minX, 1),
      (rect.height * usable) / Math.max(target.maxY - target.minY, 1),
    );
  }, [canvasRect]);

  const frameBounds = useCallback((
    target: Bounds,
    { maxZoom = 1.2, duration = 700, padding = 0.15 }: { maxZoom?: number; duration?: number; padding?: number } = {},
  ) => {
    if (!reactFlowInstance) return;
    const zoom = Math.max(0.1, Math.min(fitZoomFor(target, padding), maxZoom));
    reactFlowInstance.setCenter(
      (target.minX + target.maxX) / 2,
      (target.minY + target.maxY) / 2,
      { zoom, duration },
    );
  }, [reactFlowInstance, fitZoomFor]);

  /**
   * Settle on the beginning of a flow at a zoom you can actually read.
   *
   * Used when the graph is too long to be both fully framed and legible — an
   * attack chain is typically three times taller than it is wide, against a
   * canvas that is wider than it is tall, so fitting it wastes most of the width
   * and shrinks every card to a smudge. Fitting the *width* instead spends the
   * whole frame and lands at a readable zoom; the flow then reads top to bottom,
   * which is the direction it was laid out in and the order it happened in.
   */
  const frameStartOf = useCallback((laid: Node[], full: Bounds) => {
    const rect = canvasRect();
    if (!rect || !reactFlowInstance) return;

    const widthZoom = (rect.width * 0.85) / Math.max(full.maxX - full.minX, 1);
    const zoom = Math.min(Math.max(widthZoom, READABLE_ZOOM), START_ZOOM_MAX);
    const viewHeight = rect.height / zoom;

    // Centre on the part of the flow that will actually be on screen: the first
    // rank of a wide graph can sit well off the whole column's centre line.
    const head = laid.filter(n => n.position.y <= full.minY + viewHeight);
    const headBounds = boundsOf(head.length > 0 ? head : laid) ?? full;

    reactFlowInstance.setCenter(
      (headBounds.minX + headBounds.maxX) / 2,
      full.minY + viewHeight / 2 - 40,
      { zoom, duration: START_VIEW_MS },
    );
  }, [canvasRect, reactFlowInstance]);

  /**
   * What the user can currently see, in flow coordinates. Used to place
   * assistant-added nodes near them and to decide whether the camera needs to
   * move at all once a turn lands.
   */
  const visibleBounds = useCallback((): Bounds | null => {
    const container = document.querySelector('.flow-visualization-container');
    const rect = container?.getBoundingClientRect();
    if (!rect || !reactFlowInstance) return null;
    const topLeft = reactFlowInstance.screenToFlowPosition({ x: rect.left, y: rect.top });
    const bottomRight = reactFlowInstance.screenToFlowPosition({ x: rect.right, y: rect.bottom });
    return { minX: topLeft.x, minY: topLeft.y, maxX: bottomRight.x, maxY: bottomRight.y };
  }, [reactFlowInstance]);

  /** The box a spiral of the given radius (in cells) occupies, cards included. */
  const deckExtent = useCallback((radius: number): Bounds | null => {
    const deck = deckRef.current;
    if (!deck) return null;
    const halfWidth = (radius + 0.5) * DECK.gapX;
    const halfHeight = (radius + 0.5) * DECK.gapY;
    return {
      minX: deck.origin.x - halfWidth,
      maxX: deck.origin.x + halfWidth,
      minY: deck.origin.y - halfHeight,
      maxY: deck.origin.y + halfHeight,
    };
  }, []);

  /**
   * Open the staging deck for a run.
   *
   * A fresh analysis spirals out from the middle of the current view, so the
   * first card lands where the user is already looking. A merge stages well
   * clear of the existing flow — the exact spot barely matters, since the
   * camera follows the deck and the resolve repositions the whole cluster
   * underneath the preserved graph anyway; what matters is that a spiral of
   * unknown size can never grow back up into the user's work.
   */
  const openDeck = useCallback((preserved: Bounds | null) => {
    const view = visibleBounds();

    const origin = preserved
      ? {
          x: (preserved.minX + preserved.maxX) / 2,
          y: preserved.maxY + MERGE_CLUSTER_GAP + DECK.gapY * 8,
        }
      : view
        ? { x: (view.minX + view.maxX) / 2, y: (view.minY + view.maxY) / 2 }
        : { x: 0, y: 0 };

    // Start framing whatever already fits, so a view with room to spare does
    // not get a pointless camera move on the first card.
    const fits = view && !preserved
      ? Math.min(
          (view.maxX - view.minX) / 2 / DECK.gapX,
          (view.maxY - view.minY) / 2 / DECK.gapY,
        )
      : 0;

    deckRef.current = { origin, count: 0, framedRadius: Math.max(fits, DECK.minFramedRadius) };

    if (preserved) {
      // The merge deck is nowhere near the current view, so go to it once, now,
      // rather than letting the first card arrive somewhere off screen.
      const extent = deckExtent(DECK.minFramedRadius);
      if (extent) frameBounds(extent, { maxZoom: 1, duration: 600 });
    }
  }, [visibleBounds, deckExtent, frameBounds]);

  /**
   * The next slot in the spiral. Handed out once and never revisited — the
   * whole point of the deck is that nothing already on screen moves.
   */
  const nextDeckSlot = useCallback(() => {
    const deck = deckRef.current;
    if (!deck) return { x: 0, y: 0 };
    const index = deck.count;
    deck.count += 1;

    const radius = DECK.spiralSpacing * Math.sqrt(index);
    const angle = index * DECK.goldenAngle;
    return {
      x: deck.origin.x + radius * Math.cos(angle) * DECK.gapX,
      y: deck.origin.y + radius * Math.sin(angle) * DECK.gapY,
    };
  }, []);

  /**
   * Pull the camera back once the spiral outgrows what is framed.
   *
   * The radius climbs as sqrt(n), so this fires a handful of times across a
   * run — roughly every time the deck grows by half again — instead of on every
   * card. Each move is a genuine response to content leaving the frame, and the
   * zoom only ever goes out, so the deck reads as steadily gathering rather
   * than as a camera that cannot keep still.
   */
  const keepDeckFramed = useCallback(() => {
    const deck = deckRef.current;
    if (!deck) return;
    const radius = DECK.spiralSpacing * Math.sqrt(Math.max(deck.count - 1, 0));
    if (radius <= deck.framedRadius) return;

    deck.framedRadius = Math.max(radius * DECK.spiralHeadroom, DECK.minFramedRadius);
    const extent = deckExtent(deck.framedRadius);
    if (extent) frameBounds(extent, { maxZoom: 1, duration: 550, padding: 0.06 });
  }, [deckExtent, frameBounds]);

  // Docking or undocking the source column resizes the canvas, so re-frame
  // the graph in whatever space is left once the layout has settled
  const prevSourceOpenRef = useRef(sourcePanelOpen);
  useEffect(() => {
    if (prevSourceOpenRef.current === sourcePanelOpen) return;
    prevSourceOpenRef.current = sourcePanelOpen;
    if (nodesRef.current.length === 0) return;
    const t = setTimeout(() => editorFitView(), 80);
    return () => clearTimeout(t);
  }, [sourcePanelOpen, editorFitView]);

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
  const [inspectorFocusNotes, setInspectorFocusNotes] = useState(false);
  // Selected edge drives the edge inspector; only one inspector shows at a time.
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const openInspector = useCallback(
    (nodeId: string, opts?: { focusName?: boolean; focusNotes?: boolean }) => {
      if (isStreamingRef.current) return;
      setSelectedEdgeId(null);
      setInspectorNodeId(nodeId);
      setInspectorFocusName(opts?.focusName ?? false);
      setInspectorFocusNotes(opts?.focusNotes ?? false);
    },
    [],
  );

  const closeInspector = useCallback(() => {
    setInspectorNodeId(null);
    setInspectorFocusName(false);
    setInspectorFocusNotes(false);
  }, []);

  const handleNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    // Shift is ReactFlow's multiSelectionKeyCode, so this click is building a
    // group, not choosing a node. Retargeting the inspector on each one made it
    // flick through the selection and left it showing whichever node happened
    // to be last — the selection bar speaks for the group instead.
    if (event.shiftKey) {
      setInspectorNodeId(null);
      setInspectorFocusName(false);
      setInspectorFocusNotes(false);
      return;
    }
    // Clicking a node's note glyph opens straight onto its notes field.
    const onNoteBadge = Boolean((event.target as HTMLElement)?.closest?.('.fv-note-badge'));
    openInspector(node.id, { focusNotes: onNoteBadge });
  }, [openInspector]);

  const handleNodeDoubleClick = useCallback((event: React.MouseEvent, node: any) => {
    event.stopPropagation();
    openInspector(node.id, { focusName: true });
  }, [openInspector]);

  const handleEdgeClick = useCallback((_event: React.MouseEvent, edge: any) => {
    if (isStreamingRef.current) return;
    setInspectorNodeId(null);
    setInspectorFocusName(false);
    setInspectorFocusNotes(false);
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

  // Drives the selection bar. Ids rather than the nodes so the memo only
  // recomputes when the set actually changes, not on every drag frame.
  const selectedNodeIds = useMemo(
    () => nodes.filter(n => n.selected).map(n => n.id),
    [nodes]
  );

  // Pinned context for display. Resolved against `nodes`/`edges` rather than
  // the refs the send path uses, so the chips re-render on a rename or delete.
  const assistantContexts = useMemo(
    () => serializeContexts(assistantContextIds, nodes, edges),
    [assistantContextIds, nodes, edges]
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
  const connectStartRef = useRef<
    { nodeId: string; handleType: 'source' | 'target'; handleId?: string | null } | null
  >(null);

  const handleConnectStart = useCallback((
    _event: any,
    params: { nodeId: string | null; handleType: string | null; handleId?: string | null }
  ) => {
    connectStartRef.current = params.nodeId
      ? {
          nodeId: params.nodeId,
          handleType: (params.handleType as 'source' | 'target') ?? 'source',
          handleId: params.handleId ?? null,
        }
      : null;
  }, []);

  // Edge direction follows the drag: the node you started dragging from is the
  // source, so the arrow points at the node you dropped on — regardless of
  // which side's handle you grabbed. (In loose connection mode ReactFlow would
  // otherwise pick source/target by handle type, flipping top/left drags.)
  // The handles swap alongside the nodes, or the pinned sides would end up on
  // the wrong ends of a flipped edge.
  const handleConnect = useCallback((connection: Connection) => {
    const startId = connectStartRef.current?.nodeId;
    let { source, target, sourceHandle, targetHandle } = connection;
    if (startId && target === startId && source) {
      [source, target] = [target, source];
      [sourceHandle, targetHandle] = [targetHandle, sourceHandle];
    }
    editor.connect({ source, target, sourceHandle, targetHandle });
  }, [editor.connect]);

  // Dragging an existing endpoint onto another node (or another dot on the same
  // node) re-points that end and pins it there.
  const reconnectingRef = useRef(false);

  const handleReconnectStart = useCallback(() => {
    reconnectingRef.current = true;
  }, []);

  const handleReconnect = useCallback((oldEdge: Edge, connection: Connection) => {
    if (isStreamingRef.current) return;
    editor.reconnect(oldEdge.id, connection);
  }, [editor.reconnect]);

  const handleReconnectEnd = useCallback(() => {
    reconnectingRef.current = false;
  }, []);

  const handleConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    const connectFrom = connectStartRef.current;
    connectStartRef.current = null;
    if (!connectFrom || isStreamingRef.current) return;
    // Reconnect drags raise onConnectStart/End too. Dropping one on the canvas
    // means "I missed" — leave the edge alone rather than also spawning a node.
    if (reconnectingRef.current) return;

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
      openInspector(newNodeId, { focusName: true });
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

  // AI assistant. Ops apply one at a time as they stream, through a session
  // (a pure pass over the graph) whose ref map and placement state span the
  // turn. The session keeps its own working copy of the graph because ops
  // can arrive faster than React re-renders - reading nodesRef between two
  // same-tick ops would see stale state. The whole turn still lands as ONE
  // undo entry: the batch opens at the first applied op and finishTurn
  // closes it (or rolls the partial turn back if the stream failed). The
  // editor's own semantic ops are unsuitable here: each pushes its own
  // history entry.
  const assistantTurnRef = useRef<{
    session: OpsSession;
    nodes: typeof nodes;
    edges: typeof edges;
    opened: boolean;
  } | null>(null);

  const handleAssistantOp = useCallback((op: AssistantOp): OpResult => {
    if (isStreamingRef.current) {
      // The streaming pipeline owns the graph; dropping is safer than queueing
      return { index: 0, summary: 'Edit', status: 'skipped', reason: 'analysis in progress' };
    }
    let turn = assistantTurnRef.current;
    if (!turn) {
      // Seeded from the live graph at the turn's first op. A user edit made
      // mid-turn can be overwritten by the next applied op - the window is
      // seconds long and the alternative (re-seeding per op) breaks same-tick
      // sequences, so the trade goes this way.
      const view = visibleBounds();
      turn = {
        session: createOpsSession(getEdgeConfig(), {
          // Captured once, at the turn's first op: nodes added later in the same
          // turn stack from where the user was when they asked, even if an
          // earlier op's framing has since moved the camera.
          origin: view
            ? { x: (view.minX + view.maxX) / 2, y: (view.minY + view.maxY) / 2 }
            : null,
        }),
        nodes: nodesRef.current,
        edges: edgesRef.current,
        opened: false,
      };
      assistantTurnRef.current = turn;
    }
    const step = turn.session.applyOne(turn.nodes, turn.edges, op);
    turn.nodes = step.nodes;
    turn.edges = step.edges;
    if (step.result.status === 'applied') {
      if (!turn.opened) {
        editor.beginBatch();
        turn.opened = true;
      }
      setNodes(step.nodes);
      setEdges(step.edges);
    }
    return step.result;
  }, [getEdgeConfig, editor, setNodes, setEdges, visibleBounds]);

  const finishAssistantTurn = useCallback((instruction: string, ok: boolean) => {
    const turn = assistantTurnRef.current;
    assistantTurnRef.current = null;
    if (!turn?.opened) return;
    if (!ok) {
      editor.abortBatch();
      return;
    }
    editor.endBatch(`AI: ${instruction.slice(0, 40)}`);
    if (turn.session.didRelayout) {
      // Same deferral relayout uses: let ReactFlow commit positions first
      setTimeout(() => editorFitView(), 50);
      return;
    }

    // Frame what the turn added, together with whatever it attached to, so the
    // result is on screen. Nothing did this before: the assistant would place
    // nodes outside the viewport and the only hint was the chat transcript.
    const added = new Set(turn.session.addedNodeIds);
    if (added.size === 0) return;

    // Direct neighbours come along so a new node arrives with the context it was
    // connected to, rather than framed alone against empty canvas.
    const framed = new Set(added);
    turn.edges.forEach(edge => {
      if (added.has(edge.source)) framed.add(edge.target);
      if (added.has(edge.target)) framed.add(edge.source);
    });

    const target = boundsOf(turn.nodes.filter(n => framed.has(n.id)));
    if (!target) return;

    setTimeout(() => {
      if (!reactFlowInstance) return;
      // Already looking at it? Then hold still. Re-framing a change the user can
      // plainly see just moves the ground under them for no information.
      const view = visibleBounds();
      const alreadyVisible = view
        && target.minX >= view.minX && target.maxX <= view.maxX
        && target.minY >= view.minY && target.maxY <= view.maxY;
      if (alreadyVisible) return;

      const width = target.maxX - target.minX;
      const height = target.maxY - target.minY;

      // Pan at the zoom the user chose whenever the result fits there. fitBounds
      // takes no maxZoom and the canvas allows 4x, so framing a single new node
      // through it would rush the camera in on one card. Falling back to it only
      // when the target genuinely overflows means the zoom can only ever go out.
      if (view && width <= (view.maxX - view.minX) * 0.8 && height <= (view.maxY - view.minY) * 0.8) {
        reactFlowInstance.setCenter(
          target.minX + width / 2,
          target.minY + height / 2,
          { zoom: reactFlowInstance.getZoom(), duration: 600 },
        );
        return;
      }

      reactFlowInstance.fitBounds(
        { x: target.minX, y: target.minY, width, height },
        { padding: 0.2, duration: 600 },
      );
    }, 50);
  }, [editor, editorFitView, reactFlowInstance, visibleBounds]);

  const getAssistantGraph = useCallback(
    () => serializeGraph(nodesRef.current, edgesRef.current),
    [],
  );
  const getAssistantContexts = useCallback(
    () => serializeContexts(assistantContextIds, nodesRef.current, edgesRef.current),
    [assistantContextIds],
  );
  const getAssistantSourceText = useCallback(() => sourceText, [sourceText]);

  // [[id|label]] references in assistant replies focus their node: center it
  // and open its inspector, same as clicking the node itself
  const handleFocusNode = useCallback((nodeId: string) => {
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node || !reactFlowInstance) return;
    reactFlowInstance.setCenter(node.position.x, node.position.y, {
      zoom: Math.max(reactFlowInstance.getZoom(), 0.85),
      duration: 600,
    });
    openInspector(nodeId);
  }, [reactFlowInstance, openInspector]);

  // Chat history lives here as component state: it survives open/close
  // toggles but resets with the canvas (clear / load / new analysis remount)
  const assistant = useAssistant({
    provider: selectedProvider,
    model: selectedModel,
    getGraph: getAssistantGraph,
    getContexts: getAssistantContexts,
    getSourceText: getAssistantSourceText,
    applyOp: handleAssistantOp,
    finishTurn: finishAssistantTurn,
  });

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
  // Re-registered whenever the open state changes, since the toggle now reads
  // that state rather than owning it.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.code !== 'KeyK') return;
      event.preventDefault();
      onPaletteOpenChange(!paletteOpen);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [paletteOpen, onPaletteOpenChange]);

  const commands = useMemo<Command[]>(() => [
    {
      id: 'analyze',
      label: 'Analyze a report…',
      keywords: 'url text pdf article import threat intel merge',
      icon: FlowMark,
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
    {
      id: 'toggle-assistant',
      label: assistantOpen ? 'Hide AI assistant' : 'Open AI assistant',
      keywords: 'chat ai ask edit help',
      icon: AssistantMark,
      run: () => setAssistantOpen(prev => !prev),
    },
    {
      id: 'toggle-source',
      label: sourcePanelOpen ? 'Hide source article' : 'Show source article',
      keywords: 'article report original text provenance',
      icon: MenuBookIcon,
      disabled: !sourceText,
      run: () => setSourcePanelOpen(prev => !prev),
    },
    // Canvas commands first: they are what you are looking at. The host's file
    // operations read as the tail of the same list rather than a second menu.
    ...(hostCommands ?? []),
  ], [onAnalyzeRequested, onClearRequested, isStreaming, openNodePicker, editor, reactFlowInstance, gridVisible, toggleGrid, assistantOpen, sourcePanelOpen, sourceText, hostCommands]);

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
      setArticleText(loadedFlow.sourceText || null);
      setArticleTitle('');
      assistant.restore(loadedFlow.assistantMessages ?? []);
      // A flow saved since visionText existed carries everything its excerpts
      // were drawn from, so the check can run on it. Older ones don't say
      // whether vision ran, and an absent reading is not the same as no
      // reading — those stay unchecked rather than being guessed at.
      setVisionText(loadedFlow.visionText ?? null);
      setGroundingKnown(loadedFlow.visionText !== undefined);

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
  }, [loadedFlow, reactFlowInstance, setNodes, setEdges, getEdgeConfig, editor.resetHistory, assistant.restore]);

  /**
   * Phase two of the reveal: turn the staging deck into the graph.
   *
   * Runs once per analysis, when the edges are finally in. Everything before
   * this point was collection — cards sitting in fixed slots — because the model
   * returns its nodes and edges as two separate arrays and there is no structure
   * to lay out until the second one arrives. So this is the only layout pass,
   * and the only time anything on the canvas moves.
   *
   * Also called when a fresh analysis fails part-way: a laid-out partial graph
   * is a better thing to be left holding than a grid of loose cards.
   */
  const resolveReveal = useCallback(() => {
    const isMergeRun = preservedIdsRef.current.size > 0;
    const arrived = newNodeIdsRef.current;

    // Hands the canvas back to the user. Deferred to the end of the resolve
    // rather than fired when the stream closes: until the cards have landed the
    // graph is still assembling, and everything gated on isStreaming (selection,
    // the keyboard, edge pinning) should stay gated.
    const endRun = () => {
      setRevealPhase('idle');
      setIsStreaming(false);
      onStreamingEnd?.();
      if (isMergeRun) {
        // The merge arrived on top of work the user may want back, so it becomes
        // one undo entry rather than wiping their history.
        editor.endBatch('Analyze report');
      } else {
        // The settled graph is the undo baseline: nothing from the streaming
        // pipeline itself should be undoable.
        editor.resetHistory();
      }
    };

    const runNodes = nodesRef.current.filter(n => arrived.has(n.id));
    if (runNodes.length === 0) {
      endRun();
      return;
    }

    // No chainOrphans: it exists to fake a spine while edges are still in
    // flight, and inventing one now would override the structure that arrived.
    const runEdges = pruneOperatorBypasses(bufferedEdgesRef.current, nodesRef.current);
    const runIds = new Set(runNodes.map(n => n.id));
    const layoutEdges = runEdges.filter(e => runIds.has(e.source) && runIds.has(e.target));

    let laid = getLayoutedElements(runNodes, layoutEdges).nodes;

    if (isMergeRun && preservedBoundsRef.current) {
      const pb = preservedBoundsRef.current;
      const nb = boundsOf(laid);
      if (nb) {
        // Anchor the cluster's top edge below the existing flow and centre it
        // horizontally, so the two read as separate flows.
        const dx = (pb.minX + pb.maxX) / 2 - (nb.minX + nb.maxX) / 2;
        const dy = (pb.maxY + MERGE_CLUSTER_GAP) - nb.minY;
        laid = laid.map(n => ({ ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }));
      }
    }

    // Rank order drives the stagger, so the flow unfolds from its start rather
    // than every card setting off at once.
    const ranks = [...new Set(laid.map(n => Math.round(n.position.y)))].sort((a, b) => a - b);
    const rankIndex = new Map(ranks.map((y, i) => [y, i]));
    const staggeredRanks = Math.min(Math.max(ranks.length - 1, 0), RESOLVE_MAX_STAGGERED_RANKS);
    const settleMs = RESOLVE_MS + staggeredRanks * RESOLVE_STAGGER_MS;

    setRevealPhase('resolving');
    const laidById = new Map(laid.map(n => [n.id, n]));
    setNodes(prev => prev.map(node => {
      const destination = laidById.get(node.id);
      if (!destination) return node;
      const rank = Math.min(
        rankIndex.get(Math.round(destination.position.y)) ?? 0,
        RESOLVE_MAX_STAGGERED_RANKS,
      );
      return {
        ...destination,
        style: {
          transition: `transform ${RESOLVE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          transitionDelay: `${rank * RESOLVE_STAGGER_MS}ms`,
        },
      };
    }));

    // The camera travels on the same clock as the cards, framing where they are
    // going. Computed from `laid` rather than through fitView, so it does not
    // depend on ReactFlow having caught up with the setNodes above.
    const target = boundsOf(laid);
    if (target) {
      revealTimersRef.current.push(window.setTimeout(
        () => frameBounds(target, { maxZoom: 1.2, duration: settleMs }),
        30,
      ));

      // Overview, then start. A flow long enough that fitting it falls below
      // READABLE_ZOOM cannot show both its shape and its content at once, so it
      // shows them in turn: the cards assemble into the whole graph, hold for a
      // beat, then the camera glides to the top, where reading begins. A flow
      // that is legible when fitted just stays fitted.
      if (fitZoomFor(target) < READABLE_ZOOM) {
        revealTimersRef.current.push(window.setTimeout(
          () => frameStartOf(laid, target),
          settleMs + OVERVIEW_HOLD_MS,
        ));
      }
    }

    // Edges only once the cards have landed — see bufferedEdgesRef for why they
    // cannot be drawn while the cards are still travelling.
    revealTimersRef.current.push(window.setTimeout(() => {
      setEdges(prev => [
        ...prev.filter(e => !runIds.has(e.source) || !runIds.has(e.target)),
        ...runEdges.map(e => ({ ...e, className: 'fv-edge-enter' })),
      ]);
    }, settleMs));

    // Drop the transition styles and the entrance class once they have played,
    // so nothing re-animates when culling later brings an element back.
    revealTimersRef.current.push(window.setTimeout(() => {
      setNodes(prev => prev.map(node => arrived.has(node.id)
        ? { ...node, style: undefined, dragging: false, selected: false }
        : node));
      setEdges(prev => prev.map(e => (e.className ? { ...e, className: undefined } : e)));
      endRun();
    }, settleMs + 600));
  }, [editor, frameBounds, fitZoomFor, frameStartOf, onStreamingEnd, setNodes, setEdges]);

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
      bufferedEdgesRef.current = [];
      clearRevealTimers();

      // This run's grounding is about to be captured in full, so the excerpt
      // check can speak. Any vision text from a previous run belongs to a
      // different article and must not vouch for this one's quotes.
      setVisionText(null);
      // Declared up front so an article with no images still yields a definite
      // answer: null means "vision did not run", which is different from never
      // having been told. If vision does run, onVision overwrites this.
      onVisionExtracted?.(null);
      setGroundingKnown(true);

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

      // Deck anchored before the first card can ask for a slot. On a merge it
      // opens below the preserved flow, which is where the cluster lands anyway,
      // so the cards do not have to cross the canvas when the layout resolves.
      openDeck(preservedBoundsRef.current);

      setIsStreaming(true);
      setRevealPhase('collecting');
      setShowLoadingIndicator(true); // Show loading indicator when starting
      onStreamingStart?.(); // Notify parent that streaming has started

      // Pasted text IS the source; URL analyses get theirs via onArticle below
      const inputIsUrl = request.input.startsWith('http://') || request.input.startsWith('https://');
      if (!inputIsUrl) {
        setArticleText(request.input);
        setArticleTitle('');
      }
      
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

        onArticle: (article) => {
          if (isStale()) return;
          setArticleText(article.text);
          setArticleTitle(article.title);
          // Hoist to the host so Save can persist it as the flow's sourceText
          onArticleExtracted?.(article.text, article.title);
        },

        onVision: (text) => {
          if (isStale()) return;
          setVisionText(text);
          onVisionExtracted?.(text);
        },

        onNode: (node) => {
          if (isStale()) return;
          newNodeIdsRef.current.add(node.id);
          // Hide loading indicator when first node appears
          setShowLoadingIndicator(false);

          // Straight into a deck slot, at full opacity — the card's entrance is
          // the CSS animation, and it plays where the card will stay. Nothing
          // already on the canvas is touched.
          const position = nextDeckSlot();
          setNodes((prevNodes) => [...prevNodes, { ...node, position, style: undefined }]);
          keepDeckFramed();
        },

        onEdge: (edge) => {
          if (isStale()) return;
          // Buffered, not drawn. Every node arrives before any edge does, so at
          // this point the cards are still in the deck and an edge between two
          // of them would describe the deck, not the attack.
          if (bufferedEdgesRef.current.some(e => e.id === edge.id)) return;
          const edgeConfig = getEdgeConfig();
          bufferedEdgesRef.current.push({
            ...edge,
            type: edgeConfig.type,
            data: { ...edge.data, ...edgeConfig.data },
            style: edgeConfig.style,
          });
        },

        onComplete: () => {
          if (isStale()) return;
          activeRequestIdRef.current = null;
          streamingClientRef.current = null;
          console.log('✅ Streaming completed');
          setShowLoadingIndicator(false); // Hide loading indicator on complete
          resolveReveal();
        },

        onError: (err) => {
          if (isStale()) return;
          // Stop accepting this run's output. The client does not return after
          // reporting an error, so it can keep emitting nodes past this point —
          // this is what makes the rollback below stick.
          activeRequestIdRef.current = null;
          streamingClientRef.current = null;
          console.error('❌ Streaming error:', err);

          clearRevealTimers();
          setShowLoadingIndicator(false); // Hide loading indicator on error
          onError?.(err, request.mode); // Pass error to parent for snackbar display

          if (request.mode === 'merge') {
            // Put the canvas back rather than stranding half a report on top of
            // the user's flow.
            editor.abortBatch();
            preservedIdsRef.current = new Set();
            preservedBoundsRef.current = null;
            newNodeIdsRef.current = new Set();
            bufferedEdgesRef.current = [];
            setRevealPhase('idle');
            setIsStreaming(false);
            onStreamingEnd?.();
            return;
          }

          // A fresh analysis keeps whatever arrived, so resolve it: cards left
          // sitting in the staging deck would read as a bug rather than as a
          // partial result. resolveReveal ends the run once it settles.
          resolveReveal();
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

      // Pin node detail for the capture, so it can't follow the viewport.
      // fitView below drops the live zoom to whatever frames the whole flow —
      // deep into token territory for a large one — and without this the
      // capture would faithfully record label-less colour blocks.
      //
      // Floored at 1 rather than passed as-is: `zoom` backs off below 0.7 for a
      // flow over ~11.5k px wide or ~20M px², which would put the *image* in
      // mid/token and reintroduce the same fault on exactly the large diagrams
      // most worth exporting. A PNG can be magnified after the fact, so its
      // geometric scale should govern resolution only — never what gets drawn.
      // Detail is not recoverable once it's been left out of the capture.
      flushSync(() => setExportScale(Math.max(zoom, 1)));

      reactFlowInstance.fitView({ padding: 0.1, duration: 0 });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      try {
        const dataUrl = await toPng(viewportElement, {
          // A canvas fill, not CSS, so this can't be a var() token — the raw
          // color for whichever theme is on screen is read directly.
          backgroundColor: themePalettes[currentThemeMode()].colors.background.primary,
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
        setExportScale(null);
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
    setArticleText(null);
    setArticleTitle('');
    assistant.clear();
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
      viewport: reactFlowInstance?.getViewport() || { x: 0, y: 0, zoom: 1 },
      // The conversation is part of the investigation; capped so a long
      // session can't bloat localStorage
      assistantMessages: assistant.messages.slice(-50),
    };
  }, [nodes, edges, reactFlowInstance, assistant.messages]);

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

  // Depends on the length rather than the array, so this fires when the canvas
  // becomes empty or stops being empty and not on every drag of a node.
  useEffect(() => {
    onNodeCountChange?.(nodes.length);
  }, [nodes.length, onNodeCountChange]);

  return (
    <EdgeActionsProvider value={edgeActions}>
    <Box
      className={`flow-visualization-container${revealPhase === 'collecting' ? ' fv-collecting' : ''}`}
      sx={{
        width: '100%',
        // Take whatever the app bar leaves, rather than subtracting an assumed
        // fixed height: at fractional display scaling the bar renders a fraction
        // over its nominal size, so the arithmetic overshot the viewport by a
        // sub-pixel and left a permanent scrollbar. It is also why changing the
        // bar's height needs no corresponding edit here.
        // minHeight:0 lets this flex item shrink below its content,
        // and its used height stays definite, so ReactFlow's height:100% still
        // resolves and fills the canvas.
        flex: 1,
        minHeight: 0,
        backgroundColor: THEME.background.primary,
        position: 'relative',
        // Row layout: the docked source column takes real space, and the
        // canvas region below owns everything that floats over the graph
        display: 'flex',
      }}
    >
      {/* Docked source reader; selecting a node highlights its excerpt */}
      <SourcePanel
        open={sourcePanelOpen}
        title={articleTitle}
        text={sourceText ?? ''}
        highlightExcerpt={(inspectorNode?.data?.source_excerpt as string) || null}
        onClose={() => setSourcePanelOpen(false)}
      />

      {/* Canvas region: the graph plus its floating surfaces, anchored here
          so overlays share whatever width the source column leaves */}
      <Box sx={{ position: 'relative', flex: 1, minWidth: 0, height: '100%' }}>

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
        <PresentationScaleProvider scale={exportScale}>
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
          onEdgeUpdate={handleReconnect}
          onEdgeUpdateStart={handleReconnectStart}
          onEdgeUpdateEnd={handleReconnectEnd}
          edgesUpdatable={!isStreaming}
          // Grab radius around an edge's endpoints. Wider than the 10px default
          // because these endpoints sit a few pixels off the node's dot, and a
          // near-miss should still pick up the edge rather than the canvas.
          edgeUpdaterRadius={16}
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
          // Off for both reveal phases: during collection the deck is small
          // enough to be on screen anyway, and during the resolve a culled card
          // would be dropped from the DOM mid-flight. It also stops a card that
          // has already settled replaying its entrance when a camera move
          // remounts it.
          onlyRenderVisibleElements={revealPhase === 'idle'}
          nodeOrigin={[0.5, 0.5]}
          minZoom={0.1}
          maxZoom={4}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={false}
        >
          {gridVisible && (
            <Background
              color={flowVizTheme.colors.canvas.dots}
              variant={BackgroundVariant.Dots}
              gap={GRID_SIZE}
              size={2}
            />
          )}
          <Controls
            style={{
              backgroundColor: THEME.background.secondary,
              border: THEME.border.default,
              borderRadius: flowVizTheme.borderRadius.md
            }}
          >
            {/* Editing controls live with the zoom cluster, not a floating bar */}
            {!isStreaming && (
              <>
                <ControlButton onClick={editor.undo} disabled={!editor.canUndo} title={`Undo ${shortcutHint('Z')}`}>
                  <UndoIcon sx={{ fontSize: 14 }} />
                </ControlButton>
                <ControlButton onClick={editor.redo} disabled={!editor.canRedo} title={`Redo ${shortcutHint('Y')}`}>
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
            {sourceText && (
              <ControlButton
                onClick={() => setSourcePanelOpen(prev => !prev)}
                title={sourcePanelOpen ? 'Hide source article' : 'Show source article'}
              >
                <MenuBookIcon sx={{ fontSize: 14, opacity: sourcePanelOpen ? 1 : 0.6 }} />
              </ControlButton>
            )}
          </Controls>
        </ReactFlow>
        </PresentationScaleProvider>

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
        onClose={() => onPaletteOpenChange(false)}
        commands={commands}
      />

      {/* Editable node inspector */}
      {inspectorNode && (
        <NodeInspector
          key={inspectorNode.id}
          node={inspectorNode}
          focusName={inspectorFocusName}
          focusNotes={inspectorFocusNotes}
          onChange={(patch) => editor.updateNodeData(inspectorNode.id, patch)}
          onDelete={() => { editor.deleteNode(inspectorNode.id); closeInspector(); }}
          onDuplicate={() => {
            const newId = editor.duplicateNode(inspectorNode.id);
            // Move the inspector onto the copy, name focused for a quick rename
            if (newId) openInspector(newId, { focusName: true });
          }}
          onShowSource={
            sourceText && inspectorNode.data?.source_excerpt
              ? () => setSourcePanelOpen(true)
              : undefined
          }
          onAskAssistant={() => addAssistantContexts([inspectorNode.id])}
          groundingSources={groundingKnown ? [sourceText, visionText] : null}
          onClose={closeInspector}
          stacked={assistantOpen}
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
          stacked={assistantOpen}
        />
      )}

      {/* AI graph assistant: an orb launcher in the corner the panel opens
          into - the chat-widget idiom - swapped for the panel while open */}
      {!assistantOpen && (
        <Tooltip title="AI assistant" placement="left">
          <IconButton
            onClick={() => setAssistantOpen(true)}
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              zIndex: flowVizTheme.zIndex.canvasPanel,
              width: 44,
              height: 44,
              backgroundColor: flowVizTheme.colors.background.panel,
              border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
              boxShadow: flowVizTheme.effects.shadows.md,
              transition: `box-shadow ${flowVizTheme.motion.fast}, background-color ${flowVizTheme.motion.fast}`,
              '&:hover': {
                backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.08)',
                boxShadow: flowVizTheme.effects.shadows.lg,
              },
            }}
          >
            <AssistantMark size={30} />
          </IconButton>
        </Tooltip>
      )}
      <SelectionBar
        count={selectedNodeIds.length}
        onAskAbout={() => addAssistantContexts(selectedNodeIds)}
        onClear={() => setNodes(nds => nds.map(n => (n.selected ? { ...n, selected: false } : n)))}
      />

      <AssistantPanel
        open={assistantOpen}
        messages={assistant.messages}
        pending={assistant.pending}
        hasGraph={nodes.length > 0}
        contexts={assistantContexts}
        nodeCount={nodes.length}
        onRemoveContext={(id) => setAssistantContextIds(prev => prev.filter(x => x !== id))}
        onClearContexts={() => setAssistantContextIds([])}
        streamingText={assistant.streamingText}
        disabled={isStreaming}
        onSend={assistant.send}
        onClear={assistant.clear}
        onClose={() => setAssistantOpen(false)}
        onFocusNode={handleFocusNode}
        stacked={Boolean(inspectorNode || selectedEdge)}
      />

      </Box>

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