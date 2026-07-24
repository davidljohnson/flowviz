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

// Node color as an rgba string, for the low-alpha tints and rings that carry
// the color now that it no longer floods the whole card.
export const hexToRgba = (hex: string, alpha: number): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// The type "token": a small rounded tile that is the card's one concentrated
// moment of color — a tinted fill, a slightly firmer edge, and the icon itself
// at full strength inside. Sized up for the inspector header, down for cards.
export const getIconTileStyle = (type: string, size: number) => {
  const c = getNodeColor(type);
  return {
    width: size,
    height: size,
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: `${Math.round(size * 0.29)}px`,
    background: `linear-gradient(180deg, ${hexToRgba(c, 0.22)} 0%, ${hexToRgba(c, 0.13)} 100%)`,
    border: `1px solid ${hexToRgba(c, 0.34)}`,
    color: c,
    // A faint top-edge highlight so the tile reads as a raised chip, not a swatch.
    boxShadow: `inset 0 1px 0 ${hexToRgba(c, 0.18)}`,
    // Brightens when the card is hovered (see getBaseNodeStyle) — a small sign
    // of life, no movement.
    transition: 'filter 0.15s ease',
  };
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
    borderRadius: '12px',
    // Layered: a tight contact shadow plus a soft ambient one, so the card sits
    // on the canvas with real depth rather than a single flat drop.
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.35), 0 14px 32px -12px rgba(0, 0, 0, 0.55)',
    transition: isNewNode
      ? 'opacity 0.6s ease-out, transform 0.6s ease-out'
      : 'box-shadow 0.25s ease, transform 0.25s ease',
    opacity: isNewNode ? 0 : 1,
    transform: isNewNode ? 'scale(0.9) translateY(-16px)' : 'none',
    cursor: 'grab',
    pointerEvents: 'auto',
    userSelect: 'none',
    // Life on hover, without motion (this app deliberately never lifts on
    // hover): the ambient shadow deepens and the type token brightens a touch.
    '&:hover': {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4), 0 18px 40px -14px rgba(0, 0, 0, 0.6)',
    },
    '&:hover .fv-type-token': {
      filter: 'brightness(1.14)',
    },
    '&:active': {
      cursor: 'grabbing',
    },
    zIndex: isSelected ? 10 : 'auto',
    position: 'relative',
    overflow: 'visible',
  };
};

export const getNodeSurfaceStyle = (type: string, isSelected: boolean) => {
  const nodeColor = getNodeColor(type);
  // A single top-lit surface — no banner band. A hair lighter at the top than
  // the bottom reads as gently lit from above; the inset highlight sharpens the
  // top edge. Color stays off the card entirely until it's selected.
  const litSurface = 'linear-gradient(180deg, #1e232b 0%, #171b21 100%)';
  return {
    background: litSurface,
    border: isSelected
      ? `1px solid ${hexToRgba(nodeColor, 0.7)}`
      : '1px solid rgba(255, 255, 255, 0.08)',
    // Selection returns the type color as a border plus a soft outset ring,
    // never a heavy frame. The inset highlight rides along in both states so
    // the top edge stays crisp. Border width is constant — no reflow.
    boxShadow: isSelected
      ? `0 0 0 3px ${hexToRgba(nodeColor, 0.16)}, inset 0 1px 0 rgba(255, 255, 255, 0.06)`
      : 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
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
