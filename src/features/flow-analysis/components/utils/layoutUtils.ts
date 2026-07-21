import dagre from 'dagre';
import { Node, Edge } from 'reactflow';
import { LAYOUT_CONFIG } from '../constants';

interface LayoutOptions {
  // While streaming, nodes arrive before their edges. Chaining not-yet-connected
  // nodes in arrival order keeps the graph cascading top-to-bottom (approximating
  // the final flow) instead of piling every orphan node into one horizontal rank.
  chainOrphans?: boolean;
}

export const getLayoutedElements = (nodes: Node[], edges: Edge[], options: LayoutOptions = {}) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: LAYOUT_CONFIG.rankdir,
    ranksep: LAYOUT_CONFIG.ranksep,
    nodesep: LAYOUT_CONFIG.nodesep,
    edgesep: LAYOUT_CONFIG.edgesep,
    marginx: LAYOUT_CONFIG.marginx,
    marginy: LAYOUT_CONFIG.marginy
  });

  // Add nodes with adjusted dimensions. Operators render as small pills -
  // giving dagre their real size keeps their ranks from reserving phantom space
  nodes.forEach((node) => {
    const isOperator = node.type === 'AND_operator' || node.type === 'OR_operator';
    dagreGraph.setNode(node.id, {
      width: isOperator ? 90 : LAYOUT_CONFIG.nodeWidth,
      height: isOperator ? 44 : LAYOUT_CONFIG.nodeHeight,
      paddingLeft: LAYOUT_CONFIG.paddingLeft,
      paddingRight: LAYOUT_CONFIG.paddingRight
    });
  });

  // Add edges to the graph with weights to prioritize the technique backbone
  edges.forEach((edge) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    // Give action-to-action edges higher weight to form the main backbone
    const weight = (sourceNode?.type === 'attack-action' && targetNode?.type === 'attack-action') ? 10 : 1;

    dagreGraph.setEdge(edge.source, edge.target, { weight });
  });

  if (options.chainOrphans) {
    const connected = new Set<string>();
    edges.forEach((edge) => {
      connected.add(edge.source);
      connected.add(edge.target);
    });

    // Layout-only edges: link each unconnected node to the node streamed just
    // before it. These never reach ReactFlow, so nothing is drawn for them.
    for (let i = 1; i < nodes.length; i++) {
      if (!connected.has(nodes[i].id)) {
        dagreGraph.setEdge(nodes[i - 1].id, nodes[i].id, { weight: 1 });
      }
    }
  }

  // Calculate the layout
  dagre.layout(dagreGraph);

  // Dagre positions are node centers, and the flow renders with
  // nodeOrigin [0.5, 0.5] (position = center), so use them directly.
  // Converting via a global size here would misalign the smaller operator pills.
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    return {
      ...node,
      position: {
        x: nodeWithPosition.x,
        y: nodeWithPosition.y,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export interface Bounds { minX: number; minY: number; maxX: number; maxY: number; }

/** The size Dagre reserves for a node — the layout's own idea of its extent. */
const layoutSizeOf = (node: Node) => {
  const isOperator = node.type === 'AND_operator' || node.type === 'OR_operator';
  return {
    width: isOperator ? 90 : LAYOUT_CONFIG.nodeWidth,
    height: isOperator ? 44 : LAYOUT_CONFIG.nodeHeight,
  };
};

/**
 * Bounding box of a set of nodes.
 *
 * Deliberately uses the same fixed sizes Dagre is given rather than ReactFlow's
 * measured `node.width`: with onlyRenderVisibleElements on, a node that has
 * never been scrolled into view has no measured size at all, which would make
 * the box depend on where the user happened to be looking. Positions are node
 * centres (nodeOrigin is [0.5, 0.5]), so half-extents apply on each side.
 */
export const boundsOf = (nodes: Node[]): Bounds | null => {
  if (nodes.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    const { width, height } = layoutSizeOf(node);
    minX = Math.min(minX, node.position.x - width / 2);
    maxX = Math.max(maxX, node.position.x + width / 2);
    minY = Math.min(minY, node.position.y - height / 2);
    maxY = Math.max(maxY, node.position.y + height / 2);
  }
  return { minX, minY, maxX, maxY };
};
