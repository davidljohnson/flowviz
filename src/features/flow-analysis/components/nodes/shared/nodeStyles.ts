// Shared node styling utilities
export const NODE_COLORS: Record<string, string> = {
  'action': '#3b82f6',
  'tool': '#10b981',
  'malware': '#ef4444',
  'asset': '#f59e0b',
  'infrastructure': '#06b6d4',
  'url': '#8b5cf6',
  'vulnerability': '#f43f5e',
  'AND_operator': '#64748b',
  'OR_operator': '#64748b'
};

export const getNodeColor = (type: string): string => {
  return NODE_COLORS[type] || '#64748b';
};

// Pick a readable text color for a solid accent banner: dark ink on bright
// (warm/green/cyan) accents, white on darker/saturated ones.
export const getContrastText = (hex: string): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'rgba(10, 15, 20, 0.9)' : '#ffffff';
};

// Outer card: positioning + drop shadow + entrance animation. Carries no
// border/background itself — those live on the clipped surface below so the
// handles (children of the card) sit outside the clip and aren't cut off.
export const getBaseNodeStyle = (
  isSelected: boolean,
  isNewNode: boolean = false
) => {
  return {
    minWidth: 210,
    maxWidth: 280,
    borderRadius: '10px',
    boxShadow: '0 10px 30px -8px rgba(0, 0, 0, 0.5)',
    transition: isNewNode
      ? 'opacity 0.6s ease-out, transform 0.6s ease-out'
      : 'box-shadow 0.25s ease, transform 0.25s ease',
    opacity: isNewNode ? 0 : 1,
    transform: isNewNode ? 'scale(0.9) translateY(-16px)' : 'none',
    cursor: 'grab',
    pointerEvents: 'auto',
    userSelect: 'none',
    '&:active': {
      cursor: 'grabbing',
    },
    zIndex: isSelected ? 10 : 'auto',
    position: 'relative',
    overflow: 'visible',
  };
};

// The visible surface: the node-type border wraps an overflow-hidden box, so
// the colored banner is clipped flush to the inside of the border with no gap,
// at any border width. Selection thickens the border (1px -> 2px) — no glow.
// Solid dark fill for a node's body (the banner and border are the node color).
export const NODE_BODY_BG = 'linear-gradient(180deg, #20262f 0%, #13181f 100%)';

export const getNodeSurfaceStyle = (type: string, isSelected: boolean) => {
  const nodeColor = getNodeColor(type);
  return {
    // Base fill is the node color, so the border, the banner, and any sub-pixel
    // seam between them are all the same blue — no dark hairline. The body
    // paints its own solid dark background over the lower area. (No
    // backdrop-filter: with border-radius + overflow hidden it seams the
    // corners in Chrome, and the opaque body makes a blur pointless anyway.)
    backgroundColor: nodeColor,
    // Border stays a constant 2px so the content box never changes size (no
    // reflow/jiggle). Selection adds its extra thickness as an outset ring in
    // the same color, which lives outside layout.
    border: `2px solid ${nodeColor}`,
    boxShadow: isSelected ? `0 0 0 1px ${nodeColor}` : undefined,
    borderRadius: '10px',
    overflow: 'hidden',
    boxSizing: 'border-box' as const,
  };
};

export const getOperatorNodeStyle = (
  isSelected: boolean,
  isNewNode: boolean = false
) => {
  return {
    width: 'max-content',
    minWidth: 64,
    maxWidth: 300,
    height: 40,
    background: 'linear-gradient(180deg, rgba(32, 38, 47, 0.94) 0%, rgba(19, 24, 31, 0.96) 100%)',
    backdropFilter: 'blur(14px)',
    border: isSelected ? '1px solid rgba(255, 255, 255, 0.55)' : '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: '999px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: isNewNode
      ? 'opacity 0.6s ease-out, transform 0.6s ease-out'
      : 'box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease',
    opacity: isNewNode ? 0 : 1,
    transform: isNewNode ? 'scale(0.9) translateY(-16px)' : 'none',
    boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.45)',
    zIndex: isSelected ? 10 : 'auto',
    overflow: 'visible',
    cursor: 'grab',
    '&:active': {
      cursor: 'grabbing',
    },
    '&:hover': {
      border: isSelected ? '1px solid rgba(255, 255, 255, 0.55)' : '1px solid rgba(255, 255, 255, 0.28)',
    }
  };
};
