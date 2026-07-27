/**
 * FlowViz design tokens.
 *
 * Two palettes (dark and light) are declared here as raw values, and the
 * `flowVizTheme` object every component imports exposes the SAME token shape
 * but with `var(--fv-*)` references instead of literal colors. Switching theme
 * is therefore a single attribute flip on <html> — nothing re-renders, and no
 * component needs to know which mode is active.
 *
 * Two escape hatches exist for colors that can't be named as a token:
 *   --fv-overlay-rgb   the "ink" laid over the current surface, as an rgb
 *                      triple: white on dark, near-black on light. Written as
 *                      rgba(var(--fv-overlay-rgb), 0.08) wherever the old code
 *                      hardcoded rgba(255, 255, 255, 0.08).
 *   --fv-shadow-alpha  a multiplier on drop-shadow opacity. Light surfaces need
 *                      much weaker shadows than dark ones, so shadows are
 *                      written as rgba(0, 0, 0, calc(0.4 * var(--fv-shadow-alpha))).
 */

export type ThemeMode = 'dark' | 'light';

interface StatusTokens {
  bg: string;
  text: string;
  border: string;
  accent: string;
}

export interface ColorTokens {
  background: {
    primary: string;
    secondary: string;
    panel: string;
    raised: string;
  };
  menu: {
    appBar: string;
    dialog: string;
  };
  surface: {
    rest: string;
    hover: string;
    active: string;
    focus: string;
    /** A well sunk INTO the surface — code blocks, inline <code>. On dark that
     *  means a darker patch; on light, a light grey one. */
    recessed: string;
    recessedStrong: string;
    border: {
      subtle: string;
      default: string;
      emphasis: string;
      focus: string;
    };
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    disabled: string;
  };
  status: {
    success: StatusTokens;
    error: StatusTokens;
    warning: StatusTokens;
    info: StatusTokens;
  };
  accent: {
    blue: string;
    purple: string;
    green: string;
    orange: string;
    red: string;
  };
  /** The app shell and graph canvas, which sit below every panel. */
  canvas: {
    backdrop: string;
    bloom: string;
    dots: string;
    handle: string;
    /**
     * Opaque arrowhead ink. SVG markers can't read var() — ReactFlow writes
     * markerEnd.color into a presentation attribute — so these are read as raw
     * values via `themePalettes`, and edges are recoloured when the mode flips.
     */
    edgeArrow: string;
    edgeArrowStrong: string;
    /** Modal backdrop. A dark page needs a firm dim behind a dialog or bright
     *  elements ghost through it — a light page needs far less of one. */
    scrim: string;
  };
  /** Node cards on the canvas — elevated ABOVE the canvas in both modes. */
  node: {
    surface: string;
    border: string;
    borderHover: string;
    /** Top-edge lit highlight. Only visible on dark; transparent on light. */
    highlight: string;
    /** The AND/OR operator lozenge, which floats over the canvas. */
    operatorSurface: string;
    pill: string;
    pillHover: string;
    /** Translucent variant of `pill`, for the "add a label" placeholder. */
    pillGhost: string;
  };
  /**
   * A filled chip that inverts against the page — the assistant's send button,
   * primary-action discs. Dark ink on light fill, and vice versa.
   */
  inverse: {
    surface: string;
    surfaceHover: string;
    text: string;
  };
  scrollbar: {
    thumb: string;
    thumbHover: string;
    thumbActive: string;
  };
  /**
   * Strengths for the node "type token" — the small tinted tile carrying a
   * node's type colour. These are alphas and a mix percentage rather than
   * colours, because the tile is built from the type's own hue at runtime;
   * only how hard it lands changes between themes. See getIconTileStyle.
   */
  typeTintTop: string;
  typeTintBottom: string;
  typeRing: string;
  typeInset: string;
  /** How much of the type colour survives; the rest is typeInkBase. */
  typeInk: string;
  typeInkBase: string;
  /**
   * The keyboard focus ring. Deliberately its own token rather than reusing
   * `accent.blue`: the ring has to stay legible against every surface it can
   * land on, so it is a step brighter than the accent on dark and a step
   * deeper on light.
   */
  focusRing: string;
  /** rgb triple, not a color: see the module comment. */
  overlayRgb: string;
  /** rgb triple of the panel fill, for the few places that need it at an alpha. */
  panelRgb: string;
  /** As panelRgb, but for panels that read as raised off the page. */
  raisedRgb: string;
}

interface ShadowTokens {
  sm: string;
  md: string;
  lg: string;
}

interface Palette {
  colors: ColorTokens;
  shadows: ShadowTokens;
  /** Scalar multiplier for inline rgba(0, 0, 0, …) shadows. */
  shadowAlpha: string;
}

/** `#10b981` → `16, 185, 129`, for the rgba() forms the status tokens use. */
const rgbTriple = (hex: string): string => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? [...h].map((c) => c + c).join('') : h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

/**
 * Builds a status's four tokens from one hue.
 *
 * These used to be written out by hand, which let two colour systems into the
 * same UI: the statuses were Material defaults (#4caf50, #f44336) while
 * `accent.*` was Tailwind (#10b981, #ef4444) — two greens and two reds
 * shipping side by side. Worse, dark `warning` mixed amber for its fill with
 * orange for its accent. Deriving from a single hue makes that class of drift
 * impossible.
 *
 * `textHex` is separate because coloured text needs a different step from the
 * accent to stay legible: a lighter one on dark, a darker one on light.
 */
const statusFrom = (
  accent: string,
  { bg, border, text, textHex }: { bg: number; border: number; text: number; textHex: string },
): StatusTokens => ({
  bg: `rgba(${rgbTriple(accent)}, ${bg})`,
  text: `rgba(${rgbTriple(textHex)}, ${text})`,
  border: `rgba(${rgbTriple(accent)}, ${border})`,
  accent,
});

// One alpha ramp per mode, so the four statuses are siblings by construction.
const DARK_STATUS = { bg: 0.1, border: 0.2, text: 0.9 };
const LIGHT_STATUS = { bg: 0.1, border: 0.25, text: 0.95 };

const darkPalette: Palette = {
  colors: {
    // A four-step elevation ladder: canvas → app bar → panel → overlay. Each
    // step is a small lightness increase, which is what separates surfaces now
    // that they're opaque and the blur is gone.
    background: {
      primary: '#0d1117',
      secondary: '#161b22',
      panel: '#161b22',
      raised: '#1c222b',
    },

    menu: {
      appBar: '#12171e',
      dialog: '#1c222b',
    },

    surface: {
      rest: 'rgba(255, 255, 255, 0.03)',
      hover: 'rgba(255, 255, 255, 0.08)',
      active: 'rgba(255, 255, 255, 0.15)',
      focus: 'rgba(255, 255, 255, 0.1)',
      recessed: 'rgba(0, 0, 0, 0.2)',
      recessedStrong: 'rgba(0, 0, 0, 0.35)',
      // Borders carry the structure that blur and drop shadows used to, so
      // subtle and default are a step firmer than they were.
      border: {
        subtle: 'rgba(255, 255, 255, 0.07)',
        default: 'rgba(255, 255, 255, 0.13)',
        emphasis: 'rgba(255, 255, 255, 0.2)',
        focus: 'rgba(255, 255, 255, 0.5)',
      },
    },

    text: {
      primary: 'rgba(255, 255, 255, 0.95)',
      secondary: 'rgba(255, 255, 255, 0.7)',
      tertiary: 'rgba(255, 255, 255, 0.5)',
      disabled: 'rgba(255, 255, 255, 0.3)',
    },

    // Accents are the 500 step (matching `accent.*`); text is the 400 step, which
    // lifts every status to 5.7:1 or better against the canvas — the Material
    // values this replaced ran as low as 4.3:1 for error.
    status: {
      success: statusFrom('#10b981', { ...DARK_STATUS, textHex: '#34d399' }),
      error: statusFrom('#ef4444', { ...DARK_STATUS, textHex: '#f87171' }),
      warning: statusFrom('#f59e0b', { ...DARK_STATUS, textHex: '#fbbf24' }),
      info: statusFrom('#3b82f6', { ...DARK_STATUS, textHex: '#60a5fa' }),
    },

    accent: {
      blue: '#3b82f6',
      purple: '#8b5cf6',
      green: '#10b981',
      orange: '#f59e0b',
      red: '#ef4444',
    },

    canvas: {
      backdrop: 'radial-gradient(circle at 50% 50%, #0d1117 0%, #090b0f 100%)',
      bloom: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.15), transparent 70%)',
      dots: 'rgba(255, 255, 255, 0.22)',
      handle: '#ffffff',
      edgeArrow: 'rgb(150, 153, 158)',
      edgeArrowStrong: 'rgb(224, 227, 232)',
      scrim: 'rgba(0, 0, 0, 0.68)',
    },

    node: {
      surface: 'linear-gradient(180deg, #1e232b 0%, #171b21 100%)',
      border: 'rgba(255, 255, 255, 0.08)',
      borderHover: 'rgba(255, 255, 255, 0.28)',
      highlight: 'rgba(255, 255, 255, 0.06)',
      operatorSurface: 'linear-gradient(180deg, rgba(32, 38, 47, 0.94) 0%, rgba(19, 24, 31, 0.96) 100%)',
      pill: '#20262f',
      pillHover: '#2a323d',
      pillGhost: 'rgba(32, 38, 47, 0.9)',
    },

    inverse: {
      surface: 'rgba(255, 255, 255, 0.9)',
      surfaceHover: '#ffffff',
      text: '#0d1117',
    },

    scrollbar: {
      thumb: 'rgba(255, 255, 255, 0.1)',
      thumbHover: 'rgba(255, 255, 255, 0.15)',
      thumbActive: 'rgba(255, 255, 255, 0.2)',
    },

    typeTintTop: '0.22',
    typeTintBottom: '0.13',
    typeRing: '0.34',
    typeInset: '0.18',
    typeInk: '100%',
    typeInkBase: '#0f172a',

    focusRing: '#60a5fa',
    overlayRgb: '255, 255, 255',
    panelRgb: '13, 17, 23',
    raisedRgb: '22, 27, 34',
  },

  // Shadows separate things that genuinely float; they are not how depth is
  // expressed. `sm` is a hairline lift, `md` is for popovers and menus, `lg`
  // only for modals, which sit over a scrim and need to clear it.
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.24)',
    md: '0 6px 16px rgba(0, 0, 0, 0.28)',
    lg: '0 16px 40px rgba(0, 0, 0, 0.4)',
  },

  shadowAlpha: '1',
};

/**
 * Light mode. Same structure, and deliberately the same *relationships*: the
 * canvas is the recessed plane, panels and node cards sit above it, and colour
 * appears only as accents. Accents are a step darker than their dark-mode
 * counterparts so they still clear contrast against white.
 */
const lightPalette: Palette = {
  colors: {
    // On light every raised surface is simply white; the ladder is carried by
    // the border and, for true overlays, a shadow.
    background: {
      primary: '#eef1f6',
      secondary: '#ffffff',
      panel: '#ffffff',
      raised: '#ffffff',
    },

    menu: {
      appBar: '#ffffff',
      dialog: '#ffffff',
    },

    surface: {
      rest: 'rgba(15, 23, 42, 0.03)',
      hover: 'rgba(15, 23, 42, 0.06)',
      active: 'rgba(15, 23, 42, 0.11)',
      focus: 'rgba(15, 23, 42, 0.08)',
      recessed: 'rgba(15, 23, 42, 0.045)',
      recessedStrong: 'rgba(15, 23, 42, 0.06)',
      border: {
        subtle: 'rgba(15, 23, 42, 0.06)',
        default: 'rgba(15, 23, 42, 0.12)',
        emphasis: 'rgba(15, 23, 42, 0.22)',
        focus: 'rgba(15, 23, 42, 0.45)',
      },
    },

    text: {
      primary: 'rgba(15, 23, 42, 0.92)',
      secondary: 'rgba(15, 23, 42, 0.66)',
      // 0.48 measured 3.20:1 on white and 3.13:1 on the canvas, under the 4.5:1
      // AA floor — and tertiary carries real content: captions, hints, source
      // lines. 0.62 clears it on both (5.02 and 4.80); 0.60 sits exactly on the
      // threshold against the canvas, which is no margin at all.
      tertiary: 'rgba(15, 23, 42, 0.62)',
      // Left as-is deliberately: WCAG 1.4.3 exempts disabled controls.
      disabled: 'rgba(15, 23, 42, 0.3)',
    },

    // Same hues as `accent.*` at the 600 step; text drops to 700/800 so it holds
    // 6:1 or better on white. `success` was the odd one out before — its accent
    // was green-700 while `accent.green` was emerald-600.
    status: {
      success: statusFrom('#059669', { ...LIGHT_STATUS, textHex: '#065f46' }),
      error: statusFrom('#dc2626', { ...LIGHT_STATUS, textHex: '#b91c1c' }),
      warning: statusFrom('#d97706', { ...LIGHT_STATUS, textHex: '#92400e' }),
      info: statusFrom('#2563eb', { ...LIGHT_STATUS, textHex: '#1d4ed8' }),
    },

    accent: {
      blue: '#2563eb',
      purple: '#7c3aed',
      green: '#059669',
      orange: '#d97706',
      red: '#dc2626',
    },

    canvas: {
      backdrop: 'radial-gradient(circle at 50% 50%, #f3f5f9 0%, #e6eaf1 100%)',
      bloom: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.1), transparent 70%)',
      dots: 'rgba(15, 23, 42, 0.16)',
      handle: '#334155',
      edgeArrow: 'rgb(122, 130, 142)',
      edgeArrowStrong: 'rgb(30, 41, 59)',
      scrim: 'rgba(15, 23, 42, 0.4)',
    },

    node: {
      surface: 'linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%)',
      border: 'rgba(15, 23, 42, 0.12)',
      borderHover: 'rgba(15, 23, 42, 0.3)',
      // No lit top edge on a white card — it would only muddy the corner.
      highlight: 'rgba(255, 255, 255, 0)',
      operatorSurface: 'linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(242, 245, 250, 0.97) 100%)',
      pill: '#ffffff',
      pillHover: '#f1f4f9',
      pillGhost: 'rgba(255, 255, 255, 0.92)',
    },

    inverse: {
      surface: 'rgba(15, 23, 42, 0.88)',
      surfaceHover: '#0f172a',
      text: '#ffffff',
    },

    scrollbar: {
      thumb: 'rgba(15, 23, 42, 0.16)',
      thumbHover: 'rgba(15, 23, 42, 0.24)',
      thumbActive: 'rgba(15, 23, 42, 0.32)',
    },

    // Flat (top === bottom), barely there, and the glyph deepened to 62% of
    // its hue — which lifts the worst type from 1.8:1 to 4.2:1 against its
    // own tile while staying unmistakably red / green / amber.
    typeTintTop: '0.12',
    typeTintBottom: '0.12',
    typeRing: '0.18',
    typeInset: '0',
    typeInk: '62%',
    typeInkBase: '#0f172a',

    focusRing: '#1d4ed8',
    overlayRgb: '15, 23, 42',
    panelRgb: '255, 255, 255',
    raisedRgb: '255, 255, 255',
  },

  shadows: {
    sm: '0 1px 2px rgba(15, 23, 42, 0.06)',
    md: '0 6px 16px rgba(15, 23, 42, 0.09)',
    lg: '0 16px 40px rgba(15, 23, 42, 0.14)',
  },

  // Light surfaces can't carry the same shadow weight without looking grubby.
  shadowAlpha: '0.4',
};

export const themePalettes: Record<ThemeMode, Palette> = {
  dark: darkPalette,
  light: lightPalette,
};

/** Replaces every leaf string of T with a `var(--fv-…)` reference. */
type VarRefs<T> = { [K in keyof T]: T[K] extends string ? string : VarRefs<T[K]> };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** `{ a: { b: 'x' } }` → `{ a: { b: 'var(--fv-a-b)' } }` */
const toVarRefs = <T extends object>(shape: T, path: string[] = []): VarRefs<T> => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(shape)) {
    const next = [...path, kebab(key)];
    out[key] = isRecord(value) ? toVarRefs(value, next) : `var(--fv-${next.join('-')})`;
  }
  return out as VarRefs<T>;
};

/** `{ a: { b: 'x' } }` → `{ '--fv-a-b': 'x' }` */
const toCssVars = (shape: object, path: string[] = []): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(shape)) {
    const next = [...path, kebab(key)];
    if (isRecord(value)) {
      Object.assign(out, toCssVars(value, next));
    } else {
      out[`--fv-${next.join('-')}`] = String(value);
    }
  }
  return out;
};

/**
 * The CSS custom properties for one mode, ready to hand to MUI's GlobalStyles.
 * `--fv-shadow-*` is flattened out of `shadows` so the var reads naturally.
 */
/**
 * The type scale as custom properties, so raw CSS and anything building on the
 * design system can reach the same steps the components use. Identical in both
 * modes — type doesn't vary with the palette — but emitted alongside the colours
 * so there's one place to read tokens from.
 */
const typeCssVars = (): Record<string, string> =>
  Object.fromEntries(
    Object.entries(typeScale).flatMap(([step, v]) => [
      [`--fv-text-${step}-size`, v.fontSize],
      [`--fv-text-${step}-leading`, String(v.lineHeight)],
      [`--fv-text-${step}-tracking`, v.letterSpacing],
    ]),
  );

export const themeCssVars = (mode: ThemeMode): Record<string, string> => {
  const palette = themePalettes[mode];
  return {
    ...toCssVars(palette.colors),
    ...toCssVars({ shadow: palette.shadows }),
    ...typeCssVars(),
    '--fv-shadow-alpha': palette.shadowAlpha,
  };
};

/**
 * The tokens components import. Every color is a `var()` reference, so the
 * values below are stable across a theme switch — the browser resolves them.
 */
/**
 * The type scale.
 *
 * Six steps, and they are the only sizes the UI uses. Before this the sizes
 * were written at each call site — 1rem, 0.925rem, 0.875rem, 0.8rem, 0.75rem,
 * 0.7rem — seven values with no relationship to one another, several of them a
 * fraction of a pixel apart.
 *
 * Tracking tightens as size grows, which is the whole trick: small text needs
 * air to stay legible, large text looks loose and cheap without negative
 * tracking. Line heights tighten with size for the same reason.
 *
 * Steps are px rather than rem because this is a dense tool UI that should not
 * reflow with the browser's font-size preference — the canvas geometry assumes
 * fixed node metrics.
 */
export const typeScale = {
  /** Micro labels: chips, the node type row, tabular hints. */
  xs: { fontSize: '11px', lineHeight: 1.35, letterSpacing: '0.02em' },
  /** Captions and helper text. */
  sm: { fontSize: '12px', lineHeight: 1.45, letterSpacing: '0.01em' },
  /** Default UI text. */
  md: { fontSize: '13px', lineHeight: 1.5, letterSpacing: '0' },
  /** Emphasis, field labels, subsection headers. */
  lg: { fontSize: '14px', lineHeight: 1.45, letterSpacing: '-0.01em' },
  /** Section headers. */
  xl: { fontSize: '16px', lineHeight: 1.35, letterSpacing: '-0.015em' },
  /** Dialog and page titles — the largest type in the product. */
  '2xl': { fontSize: '18px', lineHeight: 1.3, letterSpacing: '-0.02em' },
} as const;

export type TypeStep = keyof typeof typeScale;

/**
 * Uppercase runs need their own tracking regardless of step — caps have no
 * ascender/descender variety to separate them, so they set too tight.
 */
export const uppercaseRun = {
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
};

export const flowVizTheme = {
  colors: toVarRefs(darkPalette.colors),

  /** See `typeScale`. Spread a step into any `sx`: `...flowVizTheme.type.md`. */
  type: typeScale,
  uppercase: uppercaseRun,

  // Layout tokens
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  /**
   * Corner radii, as strings carrying their own unit.
   *
   * They used to be bare numbers, which meant they resolved differently
   * depending on where they landed: emotion appends `px`, but MUI's `sx`
   * multiplies a numeric `borderRadius` by `theme.shape.borderRadius` (4). So
   * anything routed through `sx` — `createStatusStyle`, and therefore every
   * alert and chip — rendered at four times its intended radius. StatusChip was
   * drawing 24px on a 20px-tall chip, i.e. a pill, where 6px was meant.
   * Units make the token mean one thing everywhere.
   *
   * `xs` is new: `3px` appeared eight times and `4px` once, all below the old
   * floor. `xxl` (20) is gone — nothing used it, as a token or a literal.
   */
  borderRadius: {
    xs: '4px', // Inline code, scrollbar thumbs, the smallest chips
    sm: '6px', // Small elements
    md: '8px', // Standard: buttons, inputs
    lg: '12px', // Cards, panels, node corners
    xl: '16px', // Dialogs and major containers
    full: '9999px', // Pills — replaces a mix of 100px and 999px
    circle: '50%', // Discs
  },

  /**
   * Shadow only. There is no blur token: surfaces are opaque, separated by a
   * step on the background ladder and a hairline border. The three no-op blur
   * steps that briefly stood in for the removed ones are gone along with all
   * 30 `backdropFilter` declarations.
   */
  effects: {
    shadows: toVarRefs(darkPalette.shadows, ['shadow']),
  },

  /**
   * Two durations, one curve.
   *
   * The old ramp was Material's standard easing — `cubic-bezier(0.4, 0, 0.2, 1)`
   * at 150–400ms — which eases in before it eases out, so a hover reads as
   * hesitant. A dense tool wants motion that leaves immediately and settles
   * softly, so the curve is a decisive ease-out and nothing takes longer than
   * 180ms. `slow` (400ms) and `spring` are gone; neither had a single call site.
   */
  motion: {
    /** State changes: hover, focus, selection. */
    fast: '120ms cubic-bezier(0.2, 0, 0, 1)',
    /** Anything that moves or resizes rather than just recolouring. */
    normal: '180ms cubic-bezier(0.2, 0, 0, 1)',
  },

  /**
   * Stacking layers.
   *
   * These were loose numbers — 12, 1000, 1300, 2000 — chosen per component,
   * and one of them collided: the streaming bar sat at 1300, which is exactly
   * MUI's `modal`, so which of the two won was decided by DOM order rather
   * than by intent.
   *
   * The scale is deliberately interleaved with MUI's own rather than competing
   * with it, since MUI components carry their own values. `appBar`, `modal`,
   * `snackbar` and `tooltip` restate MUI's numbers so the neighbours around
   * them are readable here instead of needing a lookup.
   *
   * Values below `overlay` are app layers. Local stacking *inside* a component
   * — a label over a shine, a sticky subheader over its own list — stays a
   * plain number at the call site; it isn't a layer of the application.
   */
  zIndex: {
    /** Panels floating over the canvas: inspectors, the assistant. */
    canvasPanel: 12,
    /** Full-canvas overlays, such as the loading indicator. */
    overlay: 1000,
    /** MUI's appBar. */
    appBar: 1100,
    /** The global streaming bar: above the app bar, below modals. */
    progress: 1150,
    /** MUI's modal. */
    modal: 1300,
    /** Portalled poppers that must clear whatever opened them. */
    popper: 1350,
    /** MUI's snackbar. */
    snackbar: 1400,
    /** MUI's tooltip — the top of the stack. */
    tooltip: 1500,
  },
} as const;

/**
 * The mode currently applied to the document. Components should use the `var()`
 * tokens instead; this is for the few consumers that need a real color because
 * they paint outside CSS — canvas fills, image export.
 */
export const currentThemeMode = (): ThemeMode =>
  document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';

/**
 * Ink laid over the current surface at `alpha` — white on dark, slate on light.
 * The string form is inlined directly in most call sites; this helper exists
 * for the places that compute an alpha.
 */
export const overlay = (alpha: number) => `rgba(var(--fv-overlay-rgb), ${alpha})`;

/** A drop shadow whose weight backs off automatically in light mode. */
export const shadowInk = (alpha: number) =>
  `rgba(0, 0, 0, calc(${alpha} * var(--fv-shadow-alpha)))`;

/**
 * A raised panel: opaque fill, hairline border, and a shadow only because it
 * genuinely floats. Was `createGlassStyle` — it tinted a translucent fill and
 * leaned on a 20px backdrop blur, which is the look this system has moved off.
 */
export const createPanelStyle = () => ({
  background: flowVizTheme.colors.background.raised,
  border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
  borderRadius: flowVizTheme.borderRadius.lg,
  boxShadow: flowVizTheme.effects.shadows.md,
});


export const createStatusStyle = (status: 'success' | 'error' | 'warning' | 'info') => ({
  backgroundColor: flowVizTheme.colors.status[status].bg,
  color: flowVizTheme.colors.status[status].text,
  border: `1px solid ${flowVizTheme.colors.status[status].border}`,
  borderRadius: flowVizTheme.borderRadius.md,
});

// Scrollbar styling utility
export const createScrollbarStyle = (width = '6px') => ({
  '&::-webkit-scrollbar': {
    width,
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: flowVizTheme.colors.scrollbar.thumb,
    borderRadius: flowVizTheme.borderRadius.xs,
    '&:hover': {
      background: flowVizTheme.colors.scrollbar.thumbHover,
    },
  },
  '&::-webkit-scrollbar-thumb:active': {
    background: flowVizTheme.colors.scrollbar.thumbActive,
  },
  // For Firefox
  scrollbarWidth: 'thin' as const,
  scrollbarColor: `${flowVizTheme.colors.scrollbar.thumb} transparent`,
});
