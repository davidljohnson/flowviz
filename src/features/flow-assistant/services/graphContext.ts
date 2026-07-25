import { Node, Edge } from 'reactflow';
import { EditorNodeType } from '../../flow-editing/utils/nodeFactoryDefaults';
import { COMMON_DATA_FIELDS, TYPE_DATA_FIELDS } from '../types';

const MAX_DESCRIPTION_CHARS = 200;

export interface SerializedNode {
  id: string;
  type: string;
  [field: string]: string;
}

export interface SerializedEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface SerializedGraph {
  nodes: SerializedNode[];
  edges: SerializedEdge[];
}

export interface SerializedSelection {
  kind: 'node' | 'edge';
  id: string;
  name: string;
}

/**
 * Compact graph payload for the assistant's system prompt: ids, types, and
 * meaningful data fields only - no positions, no styling, empty fields dropped.
 */
export function serializeGraph(nodes: Node[], edges: Edge[]): SerializedGraph {
  return {
    nodes: nodes.map((node) => {
      const out: SerializedNode = { id: node.id, type: node.type ?? 'action' };
      const fields = [
        ...COMMON_DATA_FIELDS,
        ...(TYPE_DATA_FIELDS[node.type as EditorNodeType] ?? []),
      ];
      for (const field of fields) {
        const value = node.data?.[field];
        if (typeof value === 'string' && value.trim()) {
          out[field] = field === 'description' && value.length > MAX_DESCRIPTION_CHARS
            ? `${value.slice(0, MAX_DESCRIPTION_CHARS)}…`
            : value;
        }
      }
      return out;
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ...(typeof edge.label === 'string' && edge.label ? { label: edge.label } : {}),
    })),
  };
}

export function serializeSelection(
  inspectorNodeId: string | null,
  selectedEdgeId: string | null,
  nodes: Node[],
  edges: Edge[],
): SerializedSelection | null {
  if (inspectorNodeId) {
    const node = nodes.find(n => n.id === inspectorNodeId);
    if (node) {
      return { kind: 'node', id: node.id, name: (node.data?.name as string) || node.type || 'node' };
    }
  }
  if (selectedEdgeId) {
    const edge = edges.find(e => e.id === selectedEdgeId);
    if (edge) {
      return { kind: 'edge', id: edge.id, name: typeof edge.label === 'string' && edge.label ? edge.label : 'edge' };
    }
  }
  return null;
}
