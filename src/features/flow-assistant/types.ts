import { EditorNodeType } from '../flow-editing/utils/nodeFactoryDefaults';

/**
 * Operations the assistant may emit. This vocabulary is described to the model
 * in prompts/assistantPrompt.js on the server - the two must stay in sync.
 */
export type AssistantOp =
  | { op: 'add_node'; ref: string; nodeType: EditorNodeType; data?: Record<string, string>; near?: string }
  | { op: 'connect'; source: string; target: string; label?: string }
  | { op: 'update_node'; id: string; data: Record<string, string> }
  | { op: 'update_edge_label'; edgeId: string; label: string }
  | { op: 'reverse_edge'; edgeId: string }
  | { op: 'delete_node'; id: string }
  | { op: 'delete_edge'; edgeId: string }
  | { op: 'relayout' };

export interface AssistantResponse {
  message?: string;
  ops?: AssistantOp[];
}

export interface OpResult {
  index: number;
  summary: string;
  status: 'applied' | 'skipped';
  reason?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  text: string;
  opResults?: OpResult[];
}

/** Fields every node type accepts in its data bag. */
export const COMMON_DATA_FIELDS = [
  'name',
  'description',
  'confidence',
  'notes',
  'source_excerpt',
  'source_url',
] as const;

/** Type-specific data fields, matching createDefaultNodeData / the inspectors. */
export const TYPE_DATA_FIELDS: Record<EditorNodeType, readonly string[]> = {
  action: ['technique_id', 'tactic_id', 'tactic_name'],
  tool: ['command_line'],
  malware: ['command_line'],
  asset: ['role'],
  infrastructure: [],
  url: ['value'],
  vulnerability: ['cve_id'],
  AND_operator: ['operator'],
  OR_operator: ['operator'],
};

export const EDITOR_NODE_TYPES = Object.keys(TYPE_DATA_FIELDS) as EditorNodeType[];
