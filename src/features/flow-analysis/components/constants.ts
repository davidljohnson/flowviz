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