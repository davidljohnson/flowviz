import { Node, Edge } from 'reactflow';
import { createFlowNode, EditorNodeType, NODE_TYPE_LABELS } from '../../flow-editing/utils/nodeFactoryDefaults';
import { getLayoutedElements, boundsOf, layoutSizeOf } from '../../flow-analysis/components/utils/layoutUtils';
import { LAYOUT_CONFIG } from '../../flow-analysis/components/constants';
import { AssistantOp, OpResult, COMMON_DATA_FIELDS, TYPE_DATA_FIELDS, EDITOR_NODE_TYPES } from '../types';

const MAX_OPS = 50;
// Spacing for nodes placed beside or below an anchor; positions are node
// centres. Derived from the layout's own box plus its sibling gap, so a node
// the assistant drops sits where "Clean up layout" would have put it — and, more
// basically, doesn't overlap. Both offsets used to be narrower than the card
// they were spacing (260 and 140 against a 270x150 box), which is why stacked
// additions came out as a slightly staggered pile.
const NEAR_OFFSET_X = LAYOUT_CONFIG.nodeWidth + LAYOUT_CONFIG.nodesep;
const STACK_OFFSET_Y = LAYOUT_CONFIG.nodeHeight + LAYOUT_CONFIG.nodesep;
// Breathing room required between a placed node and an existing one.
const CLEARANCE = 24;
// Bounded so a dense graph can't spin here; overlapping is a worse outcome than
// off-screen only in the abstract, and 12 steps is most of a screen width.
const MAX_NUDGES = 12;

/** True if a card centred at `point` would sit on top of any existing node. */
const collides = (point: { x: number; y: number }, existing: Node[]) =>
  existing.some(node => {
    const size = layoutSizeOf(node);
    return (
      Math.abs(node.position.x - point.x) < (size.width + LAYOUT_CONFIG.nodeWidth) / 2 + CLEARANCE &&
      Math.abs(node.position.y - point.y) < (size.height + LAYOUT_CONFIG.nodeHeight) / 2 + CLEARANCE
    );
  });

/** Slide right from `point` until the slot is clear of existing nodes. */
const nudgeClear = (point: { x: number; y: number }, existing: Node[]) => {
  let candidate = point;
  for (let i = 0; i < MAX_NUDGES && collides(candidate, existing); i++) {
    candidate = { x: candidate.x + NEAR_OFFSET_X, y: candidate.y };
  }
  return candidate;
};

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
  options?: OpsSessionOptions;
}

export interface ApplyOpsOutput {
  nodes: Node[];
  edges: Edge[];
  results: OpResult[];
  /** True if at least one op applied (the caller only batches then). */
  changed: boolean;
  /** True if a relayout ran, so the caller can defer a fitView. */
  didRelayout: boolean;
  /** Ids of the nodes these ops created, so the caller can frame them. */
  addedNodeIds: string[];
}

export interface OpsSessionOptions {
  /**
   * Flow-space point that unanchored nodes grow from — the centre of what the
   * user is looking at when the turn starts. Without it they are placed off the
   * right-hand edge of the whole graph, which is nowhere near the viewport for
   * anyone zoomed in on part of a flow.
   */
  origin?: { x: number; y: number } | null;
}

export interface OpsSession {
  /** Apply one op against the given graph; returns the next graph and the verdict. */
  applyOne(nodes: Node[], edges: Edge[], op: AssistantOp): { nodes: Node[]; edges: Edge[]; result: OpResult };
  readonly didRelayout: boolean;
  /** Ids of the nodes this turn created, so the caller can frame them. */
  readonly addedNodeIds: string[];
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
export function createOpsSession(
  edgeConfig: AssistantEdgeConfig,
  options: OpsSessionOptions = {},
): OpsSession {
  const refMap = new Map<string, string>();
  // Stagger nodes added around the same anchor so they don't stack exactly
  const anchorCounts = new Map<string, number>();
  let unanchoredCount = 0;
  // Frozen at the first unanchored add so later adds stack instead of walking
  let unanchoredBase: { x: number; y: number } | undefined;
  let index = 0;
  let didRelayout = false;
  const addedNodeIds: string[] = [];

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
      if (unanchoredBase === undefined) {
        // Prefer where the user is looking. The graph bounds remain the fallback
        // for callers with no viewport to offer (tests, headless application).
        const bounds = boundsOf(nodes);
        unanchoredBase = options.origin
          ?? (bounds ? { x: bounds.maxX + NEAR_OFFSET_X, y: bounds.minY } : { x: 0, y: 0 });
      }
      // Stack down the column, then step aside from anything already there —
      // including nodes added earlier in this same turn, which are in `nodes`.
      const position = nudgeClear(
        { x: unanchoredBase.x, y: unanchoredBase.y + unanchoredCount * STACK_OFFSET_Y },
        nodes,
      );
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
        addedNodeIds.push(node.id);
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
    get addedNodeIds() {
      return addedNodeIds;
    },
  };
}

/** Batch convenience over a session - one call applies a whole op list. */
export function applyAssistantOps(input: ApplyOpsInput): ApplyOpsOutput {
  const session = createOpsSession(input.edgeConfig, input.options);
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
    addedNodeIds: session.addedNodeIds,
  };
}
