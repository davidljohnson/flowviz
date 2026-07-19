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
  deleteSelection: () => void;
  /** Delete a specific node and its connected edges. */
  deleteNode: (nodeId: string) => void;
  relayout: () => void;
  /** Create an edge from a completed handle drag; duplicates are ignored. */
  connect: (connection: { source: string | null; target: string | null }) => void;
  updateEdgeLabel: (edgeId: string, label: string) => void;
  /** Patch node.data fields; a `type` entry also updates the node's renderer type. */
  updateNodeData: (nodeId: string, patch: Record<string, unknown>) => void;
  /** Create a node at the given flow position (center). Returns the new id. */
  addNode: (type: import('./utils/nodeFactoryDefaults').EditorNodeType, position: { x: number; y: number }) => string | null;
  /** Create a node pre-connected to an existing one; one undo entry for both. */
  addConnectedNode: (
    type: import('./utils/nodeFactoryDefaults').EditorNodeType,
    position: { x: number; y: number },
    connectFrom: { nodeId: string; handleType: 'source' | 'target' }
  ) => string | null;
  /** Call from onNodeDragStart / onSelectionDragStart. */
  beginMove: () => void;
  /** Call from onNodeDragStop / onSelectionDragStop; pushes one history entry if positions changed. */
  endMove: () => void;
}
