import { Node, Edge } from 'reactflow';
import { createFlowNode, EditorNodeType, NODE_TYPE_LABELS } from '../../flow-editing/utils/nodeFactoryDefaults';
import { getLayoutedElements, boundsOf, type Bounds } from '../../flow-analysis/components/utils/layoutUtils';
import { AssistantOp, OpResult, COMMON_DATA_FIELDS, TYPE_DATA_FIELDS, EDITOR_NODE_TYPES } from '../types';

const MAX_OPS = 50;
// Spacing for nodes placed beside an anchor; positions are node centers.
const NEAR_OFFSET_X = 260;
const STACK_OFFSET_Y = 140;

export interface AssistantEdgeConfig {
  type: string;
  data: Record<string, unknown>;
  style: React.CSSProperties;
}

export interface ApplyOpsInput {
  nodes: Node[];
  edges: Edge[];
  ops: AssistantOp[];
  edgeConfig: AssistantEdgeConfig;
}

export interface ApplyOpsOutput {
  nodes: Node[];
  edges: Edge[];
  results: OpResult[];
  /** True if at least one op applied (the caller only batches then). */
  changed: boolean;
  /** True if a relayout ran, so the caller can defer a fitView. */
  didRelayout: boolean;
}

export interface OpsSession {
  /** Apply one op against the given graph; returns the next graph and the verdict. */
  applyOne(nodes: Node[], edges: Edge[], op: AssistantOp): { nodes: Node[]; edges: Edge[]; result: OpResult };
  readonly didRelayout: boolean;
}

/**
 * A session applies one assistant turn's ops - possibly one at a time as they
 * stream off the wire - while holding the state that must span the whole
 * turn: the ref map that resolves the model's temporary node handles, the
 * placement counters that stagger new nodes, and the op index. Pure over the
 * graphs it is given: the editor's semantic ops each push their own undo
 * entry and read state refs that only refresh on re-render, so a multi-op
 * turn must be computed here and landed via setNodes/setEdges inside one
 * beginBatch/endBatch bracket.
 *
 * Validation is skip-and-report: a bad op is skipped with a reason and the
 * rest still apply. The model never mints ids - new nodes carry a temporary
 * "ref", and real ids come from createFlowNode.
 */
export function createOpsSession(edgeConfig: AssistantEdgeConfig): OpsSession {
  const refMap = new Map<string, string>();
  // Stagger nodes added around the same anchor so they don't stack exactly
  const anchorCounts = new Map<string, number>();
  let unanchoredCount = 0;
  // Frozen at the first unanchored add so later adds stack instead of walking
  let initialBounds: Bounds | null | undefined;
  let index = 0;
  let didRelayout = false;

  const nodeName = (node: Node) => (node.data?.name as string) || node.type || 'node';

  const sanitizeData = (type: EditorNodeType, data: Record<string, unknown> | undefined) => {
    const allowed = new Set<string>([...COMMON_DATA_FIELDS, ...TYPE_DATA_FIELDS[type]]);
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(data ?? {})) {
      if (allowed.has(key) && typeof value === 'string') out[key] = value;
    }
    return out;
  };

  function applyOne(nodesIn: Node[], edgesIn: Edge[], op: AssistantOp) {
    const opIndex = index;
    index += 1;

    let nodes = nodesIn;
    let edges = edgesIn;
    let result: OpResult;

    const applied = (summary: string): OpResult => ({ index: opIndex, summary, status: 'applied' });
    const skipped = (summary: string, reason: string): OpResult => ({ index: opIndex, summary, status: 'skipped', reason });

    const findNode = (idOrRef: string): Node | undefined => {
      const id = refMap.get(idOrRef) ?? idOrRef;
      return nodes.find(n => n.id === id);
    };

    const placeNewNode = (near: string | undefined): { x: number; y: number } => {
      const anchor = near ? findNode(near) : undefined;
      if (anchor) {
        const count = anchorCounts.get(anchor.id) ?? 0;
        anchorCounts.set(anchor.id, count + 1);
        return { x: anchor.position.x + NEAR_OFFSET_X, y: anchor.position.y + count * STACK_OFFSET_Y };
      }
      if (initialBounds === undefined) initialBounds = boundsOf(nodes);
      const position = initialBounds
        ? { x: initialBounds.maxX + NEAR_OFFSET_X, y: initialBounds.minY + unanchoredCount * STACK_OFFSET_Y }
        : { x: unanchoredCount * NEAR_OFFSET_X, y: 0 };
      unanchoredCount += 1;
      return position;
    };

    if (opIndex >= MAX_OPS) {
      return { nodes, edges, result: skipped('Operation', `over the ${MAX_OPS}-op limit`) };
    }

    switch (op?.op) {
      case 'add_node': {
        if (!EDITOR_NODE_TYPES.includes(op.nodeType)) {
          result = skipped('Add node', `unknown node type "${op.nodeType}"`);
          break;
        }
        const node = createFlowNode(op.nodeType, placeNewNode(op.near));
        node.data = { ...node.data, ...sanitizeData(op.nodeType, op.data) };
        nodes = [...nodes, node];
        if (typeof op.ref === 'string' && op.ref) refMap.set(op.ref, node.id);
        result = applied(`Added ${NODE_TYPE_LABELS[op.nodeType]} "${nodeName(node)}"`);
        break;
      }
      case 'connect': {
        const source = findNode(op.source);
        const target = findNode(op.target);
        if (!source || !target) {
          result = skipped('Connect', `unknown node "${!source ? op.source : op.target}"`);
          break;
        }
        if (source.id === target.id) {
          result = skipped('Connect', 'self-loop');
          break;
        }
        if (edges.some(e => e.source === source.id && e.target === target.id)) {
          result = skipped('Connect', 'edge already exists');
          break;
        }
        // Same shape useFlowEditor.connect builds; defaultEdgeOptions fills the rest
        edges = [...edges, {
          id: crypto.randomUUID(),
          source: source.id,
          target: target.id,
          type: edgeConfig.type,
          data: { ...edgeConfig.data },
          style: edgeConfig.style,
          ...(typeof op.label === 'string' && op.label.trim() ? { label: op.label.trim() } : {}),
        }];
        result = applied(`Connected "${nodeName(source)}" → "${nodeName(target)}"`);
        break;
      }
      case 'update_node': {
        const node = findNode(op.id);
        if (!node) {
          result = skipped('Edit node', `unknown node "${op.id}"`);
          break;
        }
        // A type patch re-types the node, matching updateNodeData's semantics
        const rawType = op.data?.type;
        const nextType = EDITOR_NODE_TYPES.includes(rawType as EditorNodeType)
          ? (rawType as EditorNodeType)
          : (node.type as EditorNodeType);
        const patch = sanitizeData(nextType, op.data);
        if (nextType !== node.type) patch.type = nextType;
        if (Object.keys(patch).length === 0) {
          result = skipped('Edit node', 'no valid fields in patch');
          break;
        }
        nodes = nodes.map(n =>
          n.id === node.id ? { ...n, type: nextType, data: { ...n.data, ...patch } } : n
        );
        result = applied(`Updated "${nodeName(node)}"`);
        break;
      }
      case 'update_edge_label': {
        const edge = edges.find(e => e.id === op.edgeId);
        if (!edge || typeof op.label !== 'string') {
          result = skipped('Edit edge label', edge ? 'label missing' : `unknown edge "${op.edgeId}"`);
          break;
        }
        const trimmed = op.label.trim();
        edges = edges.map(e => e.id === edge.id ? { ...e, label: trimmed || undefined } : e);
        result = applied(`Relabeled edge "${trimmed}"`);
        break;
      }
      case 'reverse_edge': {
        const edge = edges.find(e => e.id === op.edgeId);
        if (!edge) {
          result = skipped('Reverse edge', `unknown edge "${op.edgeId}"`);
          break;
        }
        edges = edges.map(e => e.id === edge.id ? { ...e, source: e.target, target: e.source } : e);
        result = applied('Reversed edge');
        break;
      }
      case 'delete_node': {
        const node = findNode(op.id);
        if (!node) {
          result = skipped('Delete node', `unknown node "${op.id}"`);
          break;
        }
        nodes = nodes.filter(n => n.id !== node.id);
        // Cascade, matching useFlowEditor.deleteNode
        edges = edges.filter(e => e.source !== node.id && e.target !== node.id);
        result = applied(`Deleted "${nodeName(node)}"`);
        break;
      }
      case 'delete_edge': {
        if (!edges.some(e => e.id === op.edgeId)) {
          result = skipped('Delete edge', `unknown edge "${op.edgeId}"`);
          break;
        }
        edges = edges.filter(e => e.id !== op.edgeId);
        result = applied('Deleted edge');
        break;
      }
      case 'relayout': {
        if (nodes.length === 0) {
          result = skipped('Clean up layout', 'canvas is empty');
          break;
        }
        nodes = getLayoutedElements(nodes, edges, { chainOrphans: true }).nodes;
        didRelayout = true;
        result = applied('Cleaned up layout');
        break;
      }
      default:
        result = skipped('Unknown operation', `unrecognized op "${(op as { op?: string })?.op}"`);
    }

    return { nodes, edges, result };
  }

  return {
    applyOne,
    get didRelayout() {
      return didRelayout;
    },
  };
}

/** Batch convenience over a session - one call applies a whole op list. */
export function applyAssistantOps(input: ApplyOpsInput): ApplyOpsOutput {
  const session = createOpsSession(input.edgeConfig);
  let nodes = input.nodes;
  let edges = input.edges;
  const results: OpResult[] = [];
  for (const op of input.ops) {
    const step = session.applyOne(nodes, edges, op);
    nodes = step.nodes;
    edges = step.edges;
    results.push(step.result);
  }
  return {
    nodes,
    edges,
    results,
    changed: results.some(r => r.status === 'applied'),
    didRelayout: session.didRelayout,
  };
}
