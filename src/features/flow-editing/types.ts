import { Node, Edge } from 'reactflow';

/** A point-in-time copy of the graph used for undo/redo restoration. */
export interface FlowSnapshot {
  nodes: Node[];
  edges: Edge[];
}

export interface HistoryEntry extends FlowSnapshot {
  label: string;
}

/**
 * The endpoints of a connection the user just drew or re-dragged. The handle
 * ids name a side ('top' | 'right' | 'bottom' | 'left') and are what makes the
 * chosen dot stick — see FloatingEdge.
 */
export interface EdgeConnection {
  source: string | null;
  target: string | null;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

/**
 * Semantic edit operations exposed by useFlowEditor. Every graph mutation in
 * the app goes through one of these so it lands in undo history exactly once.
 * Phase 2 AI-assisted editing will call the same surface.
 */
export interface FlowEditorApi {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  resetHistory: () => void;
  /**
   * Bracket a change made outside the editor's own ops (a streamed analysis
   * merging into the canvas) so it becomes one undoable entry.
   * beginBatch snapshots, endBatch pushes that snapshot under `label`, and
   * abortBatch puts the snapshot back — for when the change failed part-way.
   */
  beginBatch: () => void;
  endBatch: (label: string) => void;
  abortBatch: () => void;
  deleteSelection: () => void;
  /** Delete a specific node and its connected edges. */
  deleteNode: (nodeId: string) => void;
  /** Clone a node (data included, edges not); returns the new id. */
  duplicateNode: (nodeId: string) => string | null;
  relayout: () => void;
  /** Create an edge from a completed handle drag; duplicates are ignored. */
  connect: (connection: EdgeConnection) => void;
  /** Re-point one end of an existing edge; duplicates and no-ops are ignored. */
  reconnect: (edgeId: string, connection: EdgeConnection) => void;
  updateEdgeLabel: (edgeId: string, label: string) => void;
  /** Merge per-edge overrides: data (curve), style (color/dash), markerEnd. */
  updateEdge: (edgeId: string, patch: { data?: Record<string, unknown>; style?: Record<string, unknown>; markerEnd?: unknown }) => void;
  /** Swap an edge's source/target so the arrow points the other way. */
  reverseEdge: (edgeId: string) => void;
  /** Delete a specific edge. */
  deleteEdge: (edgeId: string) => void;
  /** Patch node.data fields; a `type` entry also updates the node's renderer type. */
  updateNodeData: (nodeId: string, patch: Record<string, unknown>) => void;
  /** Create a node at the given flow position (center). Returns the new id. */
  addNode: (type: import('./utils/nodeFactoryDefaults').EditorNodeType, position: { x: number; y: number }) => string | null;
  /** Create a node pre-connected to an existing one; one undo entry for both. */
  addConnectedNode: (
    type: import('./utils/nodeFactoryDefaults').EditorNodeType,
    position: { x: number; y: number },
    connectFrom: { nodeId: string; handleType: 'source' | 'target'; handleId?: string | null }
  ) => string | null;
  /** Call from onNodeDragStart / onSelectionDragStart. */
  beginMove: () => void;
  /** Call from onNodeDragStop / onSelectionDragStop; pushes one history entry if positions changed. */
  endMove: () => void;
}
