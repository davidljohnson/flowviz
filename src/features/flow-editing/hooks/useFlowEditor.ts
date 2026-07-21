import { useCallback, useEffect, useRef } from 'react';
import { Edge, Node } from 'reactflow';
import { getLayoutedElements } from '../../flow-analysis/components/utils/layoutUtils';
import { createFlowNode, EditorNodeType } from '../utils/nodeFactoryDefaults';
import { FlowEditorApi, FlowSnapshot } from '../types';
import { useEditHistory } from './useEditHistory';

interface UseFlowEditorParams {
  nodes: Node[];
  edges: Edge[];
  setNodes: (updater: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (updater: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  isStreaming: boolean;
  /** Current settings-driven edge styling, re-applied to restored edges. */
  getEdgeConfig: () => { type: string; data: Record<string, unknown>; style: React.CSSProperties };
  /** Fit the view after operations that move many nodes (relayout). */
  fitView?: () => void;
  /** Notify the app that graph content changed (dirty tracking). */
  onContentChanged?: () => void;
}

/**
 * All graph mutations flow through the semantic operations returned here so
 * each lands in undo history exactly once. History entries are full
 * before-snapshots; node/edge objects are shared by reference so the cost per
 * entry is two small arrays.
 *
 * Ops are no-ops while streaming: the streaming pipeline owns the graph until
 * onComplete's cleanup settles, after which the caller resets history to
 * establish the baseline.
 */
export function useFlowEditor({
  nodes,
  edges,
  setNodes,
  setEdges,
  isStreaming,
  getEdgeConfig,
  fitView,
  onContentChanged,
}: UseFlowEditorParams): FlowEditorApi {
  const history = useEditHistory<FlowSnapshot>();

  // Refs so ops always see the latest graph without re-creating callbacks
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const isStreamingRef = useRef(isStreaming);
  const getEdgeConfigRef = useRef(getEdgeConfig);
  const onContentChangedRef = useRef(onContentChanged);
  const fitViewRef = useRef(fitView);
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
    isStreamingRef.current = isStreaming;
    getEdgeConfigRef.current = getEdgeConfig;
    onContentChangedRef.current = onContentChanged;
    fitViewRef.current = fitView;
  });

  // Snapshot captured at drag start, pushed at drag stop if positions changed
  const pendingMoveRef = useRef<FlowSnapshot | null>(null);

  const currentSnapshot = useCallback((): FlowSnapshot => ({
    nodes: nodesRef.current,
    edges: edgesRef.current,
  }), []);

  const commit = useCallback((label: string, before: FlowSnapshot) => {
    history.push(label, before);
    onContentChangedRef.current?.();
  }, [history]);

  // Restored edges get the current settings-driven styling so undo never
  // resurrects stale colors after the user changed edge settings mid-session
  const restore = useCallback((snapshot: FlowSnapshot) => {
    const edgeConfig = getEdgeConfigRef.current();
    setNodes(snapshot.nodes);
    setEdges(snapshot.edges.map(edge => ({
      ...edge,
      type: edgeConfig.type,
      data: { ...edge.data, ...edgeConfig.data },
      style: edgeConfig.style,
    })));
    onContentChangedRef.current?.();
  }, [setNodes, setEdges]);

  const undo = useCallback(() => {
    if (isStreamingRef.current) return;
    const state = history.undo(currentSnapshot());
    if (state) restore(state);
  }, [history, currentSnapshot, restore]);

  const redo = useCallback(() => {
    if (isStreamingRef.current) return;
    const state = history.redo(currentSnapshot());
    if (state) restore(state);
  }, [history, currentSnapshot, restore]);

  // A change made outside the editor's own ops — currently a streamed analysis
  // merging into the canvas — bracketed so it lands as one history entry
  // instead of none. Mirrors beginMove/endMove.
  const pendingBatchRef = useRef<FlowSnapshot | null>(null);

  const beginBatch = useCallback(() => {
    pendingBatchRef.current = currentSnapshot();
  }, [currentSnapshot]);

  const endBatch = useCallback((label: string) => {
    const before = pendingBatchRef.current;
    pendingBatchRef.current = null;
    if (before) commit(label, before);
  }, [commit]);

  const abortBatch = useCallback(() => {
    const before = pendingBatchRef.current;
    pendingBatchRef.current = null;
    if (before) restore(before);
  }, [restore]);

  const resetHistory = useCallback(() => {
    history.reset();
    pendingMoveRef.current = null;
  }, [history]);

  const deleteSelection = useCallback(() => {
    if (isStreamingRef.current) return;
    const selectedNodeIds = new Set(
      nodesRef.current.filter(n => n.selected).map(n => n.id)
    );
    const hasSelectedEdges = edgesRef.current.some(e => e.selected);
    if (selectedNodeIds.size === 0 && !hasSelectedEdges) return;

    const before = currentSnapshot();
    setNodes(prev => prev.filter(n => !selectedNodeIds.has(n.id)));
    // Cascade: edges attached to deleted nodes go with them
    setEdges(prev => prev.filter(e =>
      !e.selected && !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)
    ));
    commit('Delete', before);
  }, [setNodes, setEdges, currentSnapshot, commit]);

  const deleteNode = useCallback((nodeId: string) => {
    if (isStreamingRef.current) return;
    if (!nodesRef.current.some(n => n.id === nodeId)) return;
    const before = currentSnapshot();
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    commit('Delete', before);
  }, [setNodes, setEdges, currentSnapshot, commit]);

  const relayout = useCallback(() => {
    if (isStreamingRef.current) return;
    if (nodesRef.current.length === 0) return;

    const before = currentSnapshot();
    const layouted = getLayoutedElements(nodesRef.current, edgesRef.current, { chainOrphans: true });
    setNodes(layouted.nodes);
    commit('Auto-arrange', before);
    // Defer fitView until ReactFlow has committed the new node positions,
    // otherwise it frames the pre-layout bounds and lands off-screen
    setTimeout(() => fitViewRef.current?.(), 50);
  }, [setNodes, currentSnapshot, commit]);

  const addNode = useCallback((type: EditorNodeType, position: { x: number; y: number }): string | null => {
    if (isStreamingRef.current) return null;
    const before = currentSnapshot();
    const node = createFlowNode(type, position);
    setNodes(prev => [...prev, node]);
    commit('Add node', before);
    return node.id;
  }, [setNodes, currentSnapshot, commit]);

  const addConnectedNode = useCallback((
    type: EditorNodeType,
    position: { x: number; y: number },
    connectFrom: { nodeId: string; handleType: 'source' | 'target' }
  ): string | null => {
    if (isStreamingRef.current) return null;
    const origin = nodesRef.current.find(n => n.id === connectFrom.nodeId);
    if (!origin) return null;

    const before = currentSnapshot();
    const node = createFlowNode(type, position);
    // Edge follows the drag direction: the node you dragged from (origin) is
    // the source, the new node is the target — regardless of which handle.
    const [sourceNode, targetNode] = [origin, node];
    const edgeConfig = getEdgeConfigRef.current();
    const edge: Edge = {
      id: crypto.randomUUID(),
      source: sourceNode.id,
      target: targetNode.id,
      type: edgeConfig.type,
      data: { ...edgeConfig.data },
      style: edgeConfig.style,
    };

    // Node + edge land as ONE history entry so a single undo removes both
    setNodes(prev => [...prev, node]);
    setEdges(prev => [...prev, edge]);
    commit('Add connected node', before);
    return node.id;
  }, [setNodes, setEdges, currentSnapshot, commit]);

  const updateNodeData = useCallback((nodeId: string, patch: Record<string, unknown>) => {
    if (isStreamingRef.current) return;
    const node = nodesRef.current.find(n => n.id === nodeId);
    if (!node) return;

    const dataChanged = Object.entries(patch).some(([key, value]) => node.data?.[key] !== value);
    if (!dataChanged) return;

    const before = currentSnapshot();
    // data.type is duplicated on the node itself (ReactFlow renderer key), so
    // a type patch (operator AND<->OR toggle) updates both
    const nextType = typeof patch.type === 'string' ? patch.type : node.type;
    const updatedNodes = nodesRef.current.map(n =>
      n.id === nodeId ? { ...n, type: nextType, data: { ...n.data, ...patch } } : n
    );
    setNodes(updatedNodes);
    commit('Edit node', before);
  }, [setNodes, currentSnapshot, commit]);

  const connect = useCallback((connection: { source: string | null; target: string | null }) => {
    if (isStreamingRef.current) return;
    const { source, target } = connection;
    if (!source || !target) return;
    // Exact duplicates are silently ignored
    if (edgesRef.current.some(e => e.source === source && e.target === target)) return;

    const before = currentSnapshot();
    const edgeConfig = getEdgeConfigRef.current();
    const newEdge: Edge = {
      id: crypto.randomUUID(),
      source,
      target,
      type: edgeConfig.type,
      data: { ...edgeConfig.data },
      style: edgeConfig.style,
    };
    setEdges(prev => [...prev, newEdge]);
    commit('Connect', before);
  }, [setEdges, currentSnapshot, commit]);

  const updateEdgeLabel = useCallback((edgeId: string, label: string) => {
    if (isStreamingRef.current) return;
    const edge = edgesRef.current.find(e => e.id === edgeId);
    const trimmed = label.trim();
    if (!edge || (edge.label ?? '') === trimmed) return;

    const before = currentSnapshot();
    setEdges(prev => prev.map(e =>
      e.id === edgeId ? { ...e, label: trimmed || undefined } : e
    ));
    commit('Edit edge label', before);
  }, [setEdges, currentSnapshot, commit]);

  // Merge per-edge overrides: data (curve), style (color/dash), markerEnd (arrow color).
  const updateEdge = useCallback((
    edgeId: string,
    patch: { data?: Record<string, unknown>; style?: Record<string, unknown>; markerEnd?: unknown }
  ) => {
    if (isStreamingRef.current) return;
    if (!edgesRef.current.some(e => e.id === edgeId)) return;
    const before = currentSnapshot();
    setEdges(prev => prev.map(e => e.id === edgeId ? {
      ...e,
      ...(patch.data ? { data: { ...e.data, ...patch.data } } : {}),
      ...(patch.style ? { style: { ...e.style, ...patch.style } } : {}),
      ...(patch.markerEnd !== undefined ? { markerEnd: patch.markerEnd as Edge['markerEnd'] } : {}),
    } : e));
    commit('Edit edge', before);
  }, [setEdges, currentSnapshot, commit]);

  const deleteEdge = useCallback((edgeId: string) => {
    if (isStreamingRef.current) return;
    if (!edgesRef.current.some(e => e.id === edgeId)) return;
    const before = currentSnapshot();
    setEdges(prev => prev.filter(e => e.id !== edgeId));
    commit('Delete', before);
  }, [setEdges, currentSnapshot, commit]);

  // Swap source/target so the arrow points the other way.
  const reverseEdge = useCallback((edgeId: string) => {
    if (isStreamingRef.current) return;
    if (!edgesRef.current.some(e => e.id === edgeId)) return;
    const before = currentSnapshot();
    setEdges(prev => prev.map(e =>
      e.id === edgeId ? { ...e, source: e.target, target: e.source } : e
    ));
    commit('Reverse edge', before);
  }, [setEdges, currentSnapshot, commit]);

  const beginMove = useCallback(() => {
    if (isStreamingRef.current) return;
    pendingMoveRef.current = currentSnapshot();
  }, [currentSnapshot]);

  const endMove = useCallback(() => {
    const before = pendingMoveRef.current;
    pendingMoveRef.current = null;
    if (!before || isStreamingRef.current) return;

    const positionsById = new Map(before.nodes.map(n => [n.id, n.position]));
    const moved = nodesRef.current.some(n => {
      const prev = positionsById.get(n.id);
      return prev && (prev.x !== n.position.x || prev.y !== n.position.y);
    });
    if (moved) {
      commit('Move', before);
    }
  }, [commit]);

  return {
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    undo,
    redo,
    resetHistory,
    beginBatch,
    endBatch,
    abortBatch,
    deleteSelection,
    deleteNode,
    relayout,
    connect,
    updateEdgeLabel,
    updateEdge,
    reverseEdge,
    deleteEdge,
    updateNodeData,
    addNode,
    addConnectedNode,
    beginMove,
    endMove,
  };
}
