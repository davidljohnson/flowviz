import { Node } from 'reactflow';

/** Registered NODE_TYPES keys (see flow-analysis/components/constants.ts). */
export type EditorNodeType =
  | 'action'
  | 'tool'
  | 'malware'
  | 'asset'
  | 'infrastructure'
  | 'url'
  | 'vulnerability'
  | 'AND_operator'
  | 'OR_operator';

export const NODE_TYPE_LABELS: Record<EditorNodeType, string> = {
  action: 'Technique',
  tool: 'Tool',
  malware: 'Malware',
  asset: 'Asset',
  infrastructure: 'Infrastructure',
  url: 'URL',
  vulnerability: 'Vulnerability',
  AND_operator: 'AND gate',
  OR_operator: 'OR gate',
};

/**
 * Default data mirroring the shape streamed nodes carry (see
 * streamingDirectFlowClient.buildNodeData): domain fields plus duplicated
 * id/type inside data. Matching the shape keeps the STIX exporter (which
 * switches on data.type) and AFB exporter working for manual nodes.
 */
export function createDefaultNodeData(type: EditorNodeType): Record<string, unknown> {
  switch (type) {
    case 'action':
      return {
        name: 'New technique',
        description: '',
        technique_id: '',
        tactic_id: '',
        tactic_name: '',
        confidence: '',
      };
    case 'tool':
      return { name: 'New tool', description: '', command_line: '' };
    case 'malware':
      return { name: 'New malware', description: '' };
    case 'asset':
      return { name: 'New asset', description: '', role: '' };
    case 'infrastructure':
      return { name: 'New infrastructure', description: '' };
    case 'url':
      return { name: 'New URL', description: '', value: '' };
    case 'vulnerability':
      return { name: 'New vulnerability', description: '', cve_id: '' };
    case 'AND_operator':
      return { name: 'AND', operator: 'AND' };
    case 'OR_operator':
      return { name: 'OR', operator: 'OR' };
  }
}

/**
 * Build a ready-to-insert ReactFlow node. IDs are minted locally
 * (crypto.randomUUID) since model-streamed ids carry no uniqueness guarantee.
 * position is the node CENTER (the canvas uses nodeOrigin [0.5, 0.5]).
 */
export function createFlowNode(type: EditorNodeType, position: { x: number; y: number }): Node {
  const id = crypto.randomUUID();
  return {
    id,
    type,
    position,
    data: { ...createDefaultNodeData(type), type, id },
  };
}
