import { flowVizTheme, shadowInk } from '../../../../../shared/theme/flowviz-theme';

// Shared node styling utilities. The type colors below are identity, not
// chrome — a malware node is red in either theme — so they don't switch with
// the mode; only the surfaces they sit on do.
//
// Colour here is wayfinding: at low zoom it is the only thing telling an
// analyst where to key in — which is why the card carries the hue as a tint
// once it shrinks, instead of leaving it in a 22px token that vanishes. See
// tierForScale.
//
// `action` keeps its blue despite being the spine of every flow, and therefore
// the majority of any canvas. The genuine problem with that blue was never the
// share of the canvas it covered — it was that the same value was also the
// chrome accent, so one colour meant both "primary action" and "ATT&CK
// technique". Primary actions are drawn with `inverse` now, a white chip that
// matches the public site's button, which leaves the hue free to be a type
// again. At token the tint is 20%, so this composites to about rgb(18, 33, 57)
// over the canvas — a dark navy that a maroon or an olive still reads against.
//
// Operators are neutral, and dimmer. They're punctuation — a branch in the
// sentence, not a thing the attacker used — and their colour only ever
// surfaces as a glow and a picker dot.
export const NODE_COLORS: Record<string, string> = {
  'action': '#3b82f6',
  'tool': '#10b981',
  'malware': '#ef4444',
  'asset': '#f59e0b',
  'infrastructure': '#06b6d4',
  'url': '#8b5cf6',
  'vulnerability': '#f43f5e',
  'AND_operator': '#5a5c61',
  'OR_operator': '#5a5c61'
};

/**
 * The quieter of the two neutrals.
 *
 * `#64748b` used to stand here *and* on both operators, so grey meant two
 * things at once — the gates, and "type I don't recognise" — and an unmapped
 * node was indistinguishable from a logic gate. The two are separated now:
 * operators sit at #5a5c61 and an unknown type below them.
 *
 * Deliberately recessive rather than alarming. An unknown type is a data fault
 * — the model emitted something outside the schema — but it is not a security
 * finding, and the loud colour this used to be would have read as one in a
 * canvas whose whole colour language is "look here". The tradeoff is accepted
 * knowingly: a malformed node no longer announces itself, so it is identifiable
 * on inspection rather than at a glance. Colour separation from `action` is
 * what stops it being mistaken for a valid node; separation from the operators
 * is helped along by silhouette, since those are pills and this is a card.
 */
const UNKNOWN_TYPE_COLOR = '#45464a';

export const getNodeColor = (type: string): string => {
  return NODE_COLORS[type] || UNKNOWN_TYPE_COLOR;
};

/**
 * How much of itself a node draws, given the scale it will be *presented* at.
 *
 * Colour on a node lives in a 22px type token, and a 22px mark at 40% zoom is
 * eight pixels of a low-alpha tint — gone exactly when it's needed most. So
 * the card trades detail for colour as it shrinks: legible and neutral while
 * you can read it, a colour token once you can't.
 *
 * Quantised to three tiers rather than interpolated so a zoom gesture
 * re-renders nodes twice, not sixty times; the CSS transition smooths the step.
 *
 * `full` is the floor for anything being *captured* rather than viewed — see
 * usePresentationScale. Detail follows presentation scale, not viewport zoom,
 * which is what keeps PNG export at full fidelity no matter how far out the
 * user happens to be sitting.
 */
export type DetailTier = 'full' | 'mid' | 'token';

export const tierForScale = (scale: number): DetailTier =>
  scale >= 0.7 ? 'full' : scale >= 0.45 ? 'mid' : 'token';

/**
 * The type colour as it should actually be *drawn* — full strength on a dark
 * surface, mixed down toward ink on a light one, where the raw hue is too
 * bright to read (amber on white is about 2:1). Use this anywhere the colour
 * is the visible mark: tile glyphs, picker dots. Use getNodeColor for the raw
 * hue where it's a tint or a ring rather than a mark.
 */
export const getTypeInk = (type: string): string =>
  `color-mix(in srgb, ${getNodeColor(type)} var(--fv-type-ink), ${flowVizTheme.colors.typeInkBase})`;

// Node color as an rgba string, for the low-alpha tints and rings that carry
// the color now that it no longer floods the whole card. `alpha` may be a
// var() reference where the strength has to differ per theme.
export const hexToRgba = (hex: string, alpha: number | string): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// The type "token": a small rounded tile that is the card's one concentrated
// moment of color. Sized up for the inspector header, down for cards.
//
// Every strength here is a variable rather than a constant, because a tint is
// not the same gesture in both themes. Alpha over a dark card DARKENS toward
// the surface, giving a deep muted shade that a full-strength glyph reads
// cleanly against. The identical alpha over a white card LIGHTENS toward white,
// giving a pastel — and a full-strength glyph on a pastel of its own hue has
// almost no contrast (measured 1.8:1 on asset, against a 3:1 floor). So on
// light the fill drops to a whisper, the gradient flattens (a gradient across a
// pale tint reads as a smudge), the top-edge highlight goes away entirely, and
// the glyph is mixed down toward ink so it reads as colored ink rather than
// neon. Dark keeps a 100% mix, which resolves to the untouched color.
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
    background: `linear-gradient(180deg, ${hexToRgba(c, 'var(--fv-type-tint-top)')} 0%, ${hexToRgba(c, 'var(--fv-type-tint-bottom)')} 100%)`,
    border: `1px solid ${hexToRgba(c, 'var(--fv-type-ring)')}`,
    color: getTypeInk(type),
    boxShadow: `inset 0 1px 0 ${hexToRgba(c, 'var(--fv-type-inset)')}`,
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
    borderRadius: flowVizTheme.borderRadius.lg,
    // Layered: a tight contact shadow plus a soft ambient one, so the card sits
    // on the canvas with real depth rather than a single flat drop.
    boxShadow: `0 1px 2px ${shadowInk(0.35)}, 0 14px 32px -12px ${shadowInk(0.55)}`,
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
      boxShadow: `0 2px 4px ${shadowInk(0.4)}, 0 18px 40px -14px ${shadowInk(0.6)}`,
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

// Tint laid over the card surface once the label stops being readable. These
// are low on purpose: what makes colour look cheap is a saturated fill over a
// large area, and what makes it look precise is a quiet field with one crisp
// saturated edge — so the fill stays a whisper and the ring does the work.
const TIER_FILL: Record<DetailTier, number> = { full: 0, mid: 0.10, token: 0.20 };
const TIER_RING: Record<DetailTier, number> = { full: 0, mid: 0.45, token: 0.75 };

export const getNodeSurfaceStyle = (
  type: string,
  isSelected: boolean,
  tier: DetailTier = 'full',
  /** True while the tier is pinned for a capture — see useDetailState. */
  pinned: boolean = false,
) => {
  const nodeColor = getNodeColor(type);
  // A single top-lit surface — no banner band. A hair lighter at the top than
  // the bottom reads as gently lit from above; the inset highlight sharpens the
  // top edge. At `full` the colour stays off the card entirely until it's
  // selected; below that the card becomes the type token itself, because a
  // 22px glyph has stopped carrying the type by then.
  const litSurface = flowVizTheme.colors.node.surface;
  const fill = TIER_FILL[tier];
  // Selection outranks the tier ring in every tier, so a selected card is
  // never ambiguous against an unselected one of the same type.
  const ring = isSelected ? (tier === 'token' ? 0.95 : 0.7) : TIER_RING[tier];

  // The ring is drawn as an INSET SHADOW at token, not a thicker border.
  //
  // Borders are scaled by the viewport transform along with everything else, so
  // the 1px edge that reads as crisp at 100% is 0.4px at token and antialiases
  // into a smudge — losing the one saturated edge that keeps a tinted card from
  // looking like a sticker. Widening the border would fix the optics and break
  // the geometry: `borderRadius`/`boxSizing` hold the *width* at 210, but height
  // is content-driven, so extra border thickness grows the box and shifts the
  // layout (and the export bounds) mid-zoom. A shadow never participates in
  // layout, so it can carry the weight for free.
  const tokenRing = tier === 'token'
    ? `inset 0 0 0 2px ${hexToRgba(nodeColor, ring)}, `
    : '';

  return {
    // A flat tint stacked over the lit surface rather than replacing it, so the
    // top-lit gradient survives underneath the colour.
    background: fill
      ? `linear-gradient(0deg, ${hexToRgba(nodeColor, fill)}, ${hexToRgba(nodeColor, fill)}), ${litSurface}`
      : litSurface,
    border: ring
      ? `1px solid ${hexToRgba(nodeColor, ring)}`
      : `1px solid ${flowVizTheme.colors.node.border}`,
    // Selection returns the type color as a border plus a soft outset ring,
    // never a heavy frame. The inset highlight rides along in both states so
    // the top edge stays crisp (it's transparent in light mode, where a white
    // card has no edge to catch). Border width is constant — no reflow.
    boxShadow: isSelected
      ? `${tokenRing}0 0 0 3px ${hexToRgba(nodeColor, 0.16)}, inset 0 1px 0 ${flowVizTheme.colors.node.highlight}`
      : `${tokenRing}inset 0 1px 0 ${flowVizTheme.colors.node.highlight}`,
    borderRadius: flowVizTheme.borderRadius.lg,
    // Colour and ring cross-fade between tiers; geometry never moves. Off for a
    // capture, which has to be correct on the first frame, not 180ms later.
    transition: pinned ? 'none' : 'background 180ms ease, border-color 180ms ease',
    overflow: 'hidden',
    boxSizing: 'border-box' as const,
  };
};

export const getOperatorNodeStyle = (
  type: string,
  isSelected: boolean,
  isNewNode: boolean = false,
  tier: DetailTier = 'full',
  pinned: boolean = false,
) => {
  const c = getNodeColor(type);

  // Only `token` differs. A gate is two or three characters of bold, tracked
  // caps — it stays legible well below the point a card's body copy gives out —
  // so operators skip the `mid` step the cards take.
  const token = tier === 'token';

  // At token the word is gone, and the pill has to carry AND-vs-OR by itself.
  // Hue isn't available to do it: both gates are structural greys, and colour
  // on this canvas means "entity". So the distinction falls to value — AND
  // fills solid, OR stays hollow. When even that doesn't resolve, the lozenge
  // silhouette still reads as "a branch here", which is the part that matters
  // most at a glance.
  const filled = type === 'AND_operator';

  // As on the cards: a 1px border is sub-pixel once the viewport scales it, so
  // the ring that has to survive is drawn as an inset shadow instead.
  const ringInk = hexToRgba(c, isSelected ? 0.95 : 0.8);
  const tokenRing = token ? `inset 0 0 0 2px ${ringInk}, ` : '';

  const restingBorder = token
    ? `1px solid ${ringInk}`
    : isSelected
      ? '1px solid rgba(var(--fv-overlay-rgb), 0.55)'
      : '1px solid rgba(var(--fv-overlay-rgb), 0.14)';

  return {
    width: 'max-content',
    minWidth: 64,
    maxWidth: 300,
    height: 40,
    background: token
      ? hexToRgba(c, filled ? 0.85 : 0.14)
      : flowVizTheme.colors.node.operatorSurface,
    border: restingBorder,
    borderRadius: flowVizTheme.borderRadius.full,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    // No animation for a capture — it has to be right on the first frame.
    transition: pinned
      ? 'none'
      : isNewNode
        ? 'opacity 0.6s ease-out, transform 0.6s ease-out'
        : 'box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease',
    opacity: isNewNode ? 0 : 1,
    transform: isNewNode ? 'scale(0.9) translateY(-16px)' : 'none',
    boxShadow: `${tokenRing}0 8px 24px -6px ${shadowInk(0.45)}`,
    zIndex: isSelected ? 10 : 'auto',
    overflow: 'visible',
    cursor: 'grab',
    '&:active': {
      cursor: 'grabbing',
    },
    '&:hover': {
      border: token
        ? restingBorder
        : isSelected
          ? '1px solid rgba(var(--fv-overlay-rgb), 0.55)'
          : '1px solid rgba(var(--fv-overlay-rgb), 0.28)',
    }
  };
};
