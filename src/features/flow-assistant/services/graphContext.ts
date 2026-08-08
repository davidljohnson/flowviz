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

/**
 * One thing the user has pinned for the assistant's attention.
 *
 * Emphasis, not a filter: the whole graph goes up on every turn regardless, and
 * the panel says so with a chip of its own. A context narrows what the user is
 * pointing *at*, never what the model is allowed to see.
 */
export interface SerializedContext {
  kind: 'node' | 'edge';
  id: string;
  name: string;
  /** Drives the chip's type colour. Nodes only — edges have no type token. */
  nodeType?: string;
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

/**
 * Resolve pinned ids against the live graph.
 *
 * Ids rather than snapshots is the point: a pinned node that gets renamed
 * shows its new name, and one that gets deleted drops out of the row instead
 * of leaving a chip pointing at nothing. Order follows `ids`, so chips sit in
 * the order they were added.
 */
export function serializeContexts(
  ids: string[],
  nodes: Node[],
  edges: Edge[],
): SerializedContext[] {
  const out: SerializedContext[] = [];
  for (const id of ids) {
    const node = nodes.find(n => n.id === id);
    if (node) {
      out.push({
        kind: 'node',
        id: node.id,
        name: (node.data?.name as string) || node.type || 'node',
        nodeType: node.type,
      });
      continue;
    }
    const edge = edges.find(e => e.id === id);
    if (edge) {
      out.push({
        kind: 'edge',
        id: edge.id,
        name: typeof edge.label === 'string' && edge.label ? edge.label : 'edge',
      });
    }
  }
  return out;
}
