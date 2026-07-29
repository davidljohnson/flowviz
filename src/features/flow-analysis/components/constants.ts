import { NodeFactory } from './nodes';
import { NodeProps } from 'reactflow';
import { flowVizTheme, shadowInk } from '../../../shared/theme/flowviz-theme';

export type ValidNodeTypes = 
  | 'action'
  | 'tool' 
  | 'malware'
  | 'asset'
  | 'infrastructure'
  | 'url'
  | 'vulnerability'
  | 'AND_operator'
  | 'OR_operator';

export const NODE_TYPES: Record<ValidNodeTypes, React.ComponentType<NodeProps>> = {
  'action': NodeFactory,
  'tool': NodeFactory,
  'malware': NodeFactory,
  'asset': NodeFactory,
  'infrastructure': NodeFactory,
  'url': NodeFactory,
  'vulnerability': NodeFactory,
  'AND_operator': NodeFactory,
  'OR_operator': NodeFactory,
};

export const THEME = {
  background: {
    primary: flowVizTheme.colors.background.primary,
    secondary: 'rgba(var(--fv-raised-rgb), 0.95)',
    tertiary: 'rgba(var(--fv-panel-rgb), 0.95)',
  },
  text: {
    primary: flowVizTheme.colors.text.primary,
    secondary: 'rgba(var(--fv-overlay-rgb), 0.7)',
    muted: 'rgba(var(--fv-overlay-rgb), 0.5)',
  },
  border: {
    default: '1px solid rgba(var(--fv-overlay-rgb), 0.1)',
    hover: '1px solid rgba(var(--fv-overlay-rgb), 0.2)',
  },
  spacing: {
    panel: 16,
    section: 24,
  },
  shadow: {
    panel: `0 4px 20px ${shadowInk(0.4)}`,
  }
} as const;

export const EDGE_STYLES = {
  default: {
    stroke: 'rgba(var(--fv-overlay-rgb), 0.7)',
    strokeWidth: 1.5,
    strokeDasharray: '4 4',
  },
  highlighted: {
    stroke: flowVizTheme.colors.accent.blue,
    strokeWidth: 2,
    strokeDasharray: '0',
  },
  animated: {
    strokeDasharray: '4 4',
    animation: 'dashAnimation 1s linear infinite',
  }
} as const;

export const LABEL_STYLES = {
  fontSize: 11,
  color: flowVizTheme.colors.text.secondary,
  fontWeight: 500,
  backgroundColor: 'rgba(var(--fv-panel-rgb), 0.95)',
  padding: '2px 6px',
  borderRadius: flowVizTheme.borderRadius.xs,
} as const;

export const LABEL_BG_STYLES = {
  fill: 'rgba(var(--fv-panel-rgb), 0.95)',
  rx: 3,
  ry: 3,
} as const;

/**
 * Vertical gap between the flow already on the canvas and one merged in from a
 * second report. Comfortably wider than ranksep so the two read as separate
 * flows rather than one continuous chain.
 */
export const MERGE_CLUSTER_GAP = 240;

export const LAYOUT_CONFIG = {
  rankdir: 'TB', // Top-to-bottom layout
  ranksep: 110,  // Vertical gap between ranks (leaves room for edge labels)
  nodesep: 60,   // Horizontal gap between siblings in the same rank
  edgesep: 30,   // Spacing between parallel edges
  marginx: 60,   // Margin around graph
  marginy: 60,   // Margin around graph
  // Match the real rendered card size (max-width 280 + shadow, ~150px tall)
  // so Dagre's gaps are true gaps - undersized dims force oversized spacing
  nodeWidth: 270,
  nodeHeight: 150,
  paddingLeft: 25,
  paddingRight: 25,
} as const;

/**
 * The staging deck streamed nodes land in before the graph is laid out.
 *
 * The model returns `{"nodes": [...], "edges": [...]}` — two separate arrays —
 * so every node arrives before any edge does. For the whole node phase there is
 * no structure to lay out, and the layout that used to run per-node was
 * therefore a guess that got thrown away on the next arrival. Cards are placed
 * by arrival index instead: a slot is assigned once, when the card lands, and
 * never revised, so nothing on screen moves until the real edges are in and the
 * graph resolves.
 */
export const DECK = {
  /**
   * The cell a card occupies — its layout box plus a gap. Slots are placed in
   * these units and scaled back out, which is what lets one circular spiral
   * arrange cards that are much wider than they are tall.
   */
  gapX: 310,
  gapY: 190,
  /**
   * 137.5°, the angle between successive slots. It is the one angle that never
   * lets slots line up into spokes, however many arrive — which is exactly the
   * property wanted here, since the count is unknown until the stream ends.
   */
  goldenAngle: Math.PI * (3 - Math.sqrt(5)),
  /**
   * Radial spacing, in cells: slot n sits at radius `spiralSpacing * sqrt(n)`.
   *
   * Sqrt keeps the density constant as the spiral grows. The coefficient is
   * what stops cards touching, and it is derived rather than picked: a
   * sunflower packing puts nearest neighbours 1.905c apart, and because cards
   * are rectangles rather than discs the tightest case is a neighbour at ~42°,
   * which needs 1.176 cells of separation to stay clear. That puts the minimum
   * at 0.617; 0.68 leaves about 10% margin.
   */
  spiralSpacing: 0.68,
  /**
   * How much room the camera leaves when it pulls back, as a multiple of the
   * current radius. Larger means fewer, bigger pull-backs.
   */
  spiralHeadroom: 1.5,
  /** Smallest radius, in cells, the camera will frame — stops it hugging card one. */
  minFramedRadius: 1.6,
} as const;

/**
 * The zoom below which a card stops carrying information.
 *
 * A card's name is 0.92rem — about 15px — so under this it renders below 8px
 * and the card is a shape rather than a label. A flow that can only be fitted
 * below this is one where "fit everything" frames the whole graph and tells you
 * nothing about any of it; an attack chain 30 steps long fits at about 0.17.
 */
export const READABLE_ZOOM = 0.55;
/** Ceiling on the start view, so a short flow is not magnified into it. */
export const START_ZOOM_MAX = 1;
/** Beat held on the whole flow before gliding to its start. */
export const OVERVIEW_HOLD_MS = 650;
/** How long that glide takes. */
export const START_VIEW_MS = 950;

/** How long a card takes to travel from its deck slot to its final position. */
export const RESOLVE_MS = 700;
/** Extra delay per rank, so the graph unfolds top-down rather than snapping. */
export const RESOLVE_STAGGER_MS = 45;
/** Ranks past this share the last delay, capping the total on a deep flow. */
export const RESOLVE_MAX_STAGGERED_RANKS = 10;

export const TACTIC_NAMES: Record<string, string> = {
  TA0001: 'Initial Access',
  TA0002: 'Execution', 
  TA0003: 'Persistence',
  TA0004: 'Privilege Escalation',
  TA0005: 'Defense Evasion',
  TA0006: 'Credential Access',
  TA0007: 'Discovery',
  TA0008: 'Lateral Movement',
  TA0009: 'Collection',
  TA0010: 'Exfiltration',
  TA0011: 'Command and Control',
  TA0040: 'Impact',
} as const;