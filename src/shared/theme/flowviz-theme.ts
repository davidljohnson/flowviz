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
    glass: string;
    glassLight: string;
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
    /** Modal backdrop. Glass paper needs a firm dim behind it or bright
     *  elements ghost through — but a light page needs far less of one. */
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
  /** rgb triple, not a color: see the module comment. */
  overlayRgb: string;
  /** rgb triple used by createGlassStyle to tint glass panels. */
  glassRgb: string;
  /** As glassRgb, but for panels that read as raised off the page. */
  glassElevatedRgb: string;
}

interface ShadowTokens {
  sm: string;
  md: string;
  lg: string;
  glow: string;
}

interface Palette {
  colors: ColorTokens;
  shadows: ShadowTokens;
  /** Scalar multiplier for inline rgba(0, 0, 0, …) shadows. */
  shadowAlpha: string;
}

const darkPalette: Palette = {
  colors: {
    background: {
      primary: '#0d1117',
      secondary: '#161b22',
      glass: 'rgba(13, 17, 23, 0.95)',
      glassLight: 'rgba(20, 25, 35, 0.92)',
    },

    menu: {
      appBar: 'rgba(13, 17, 23, 0.95)',
      dialog: 'rgba(20, 25, 35, 0.92)',
    },

    surface: {
      rest: 'rgba(255, 255, 255, 0.03)',
      hover: 'rgba(255, 255, 255, 0.08)',
      active: 'rgba(255, 255, 255, 0.15)',
      focus: 'rgba(255, 255, 255, 0.1)',
      recessed: 'rgba(0, 0, 0, 0.2)',
      recessedStrong: 'rgba(0, 0, 0, 0.35)',
      border: {
        subtle: 'rgba(255, 255, 255, 0.05)',
        default: 'rgba(255, 255, 255, 0.1)',
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

    status: {
      success: {
        bg: 'rgba(76, 175, 80, 0.1)',
        text: 'rgba(76, 175, 80, 0.9)',
        border: 'rgba(76, 175, 80, 0.2)',
        accent: '#4caf50',
      },
      error: {
        bg: 'rgba(244, 67, 54, 0.1)',
        text: 'rgba(244, 67, 54, 0.9)',
        border: 'rgba(244, 67, 54, 0.2)',
        accent: '#f44336',
      },
      warning: {
        bg: 'rgba(255, 193, 7, 0.1)',
        text: 'rgba(255, 193, 7, 0.9)',
        border: 'rgba(255, 193, 7, 0.2)',
        accent: '#ff9800',
      },
      info: {
        bg: 'rgba(33, 150, 243, 0.1)',
        text: 'rgba(33, 150, 243, 0.9)',
        border: 'rgba(33, 150, 243, 0.2)',
        accent: '#2196f3',
      },
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

    overlayRgb: '255, 255, 255',
    glassRgb: '13, 17, 23',
    glassElevatedRgb: '22, 27, 34',
  },

  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.15)',
    md: '0 4px 16px rgba(0, 0, 0, 0.2)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.3)',
    glow: '0 0 20px rgba(59, 130, 246, 0.3)',
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
    background: {
      primary: '#eef1f6',
      secondary: '#ffffff',
      glass: 'rgba(255, 255, 255, 0.95)',
      glassLight: 'rgba(252, 253, 255, 0.94)',
    },

    menu: {
      appBar: 'rgba(255, 255, 255, 0.97)',
      dialog: 'rgba(252, 253, 255, 0.96)',
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
      tertiary: 'rgba(15, 23, 42, 0.48)',
      disabled: 'rgba(15, 23, 42, 0.3)',
    },

    status: {
      success: {
        bg: 'rgba(22, 128, 82, 0.1)',
        text: 'rgba(21, 105, 68, 0.95)',
        border: 'rgba(22, 128, 82, 0.25)',
        accent: '#15803d',
      },
      error: {
        bg: 'rgba(220, 38, 38, 0.09)',
        text: 'rgba(176, 27, 27, 0.95)',
        border: 'rgba(220, 38, 38, 0.24)',
        accent: '#dc2626',
      },
      warning: {
        bg: 'rgba(217, 119, 6, 0.11)',
        text: 'rgba(154, 84, 4, 0.95)',
        border: 'rgba(217, 119, 6, 0.26)',
        accent: '#d97706',
      },
      info: {
        bg: 'rgba(37, 99, 235, 0.09)',
        text: 'rgba(29, 78, 216, 0.95)',
        border: 'rgba(37, 99, 235, 0.24)',
        accent: '#2563eb',
      },
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

    overlayRgb: '15, 23, 42',
    glassRgb: '255, 255, 255',
    glassElevatedRgb: '255, 255, 255',
  },

  shadows: {
    sm: '0 2px 8px rgba(15, 23, 42, 0.07)',
    md: '0 4px 16px rgba(15, 23, 42, 0.1)',
    lg: '0 8px 32px rgba(15, 23, 42, 0.14)',
    glow: '0 0 20px rgba(37, 99, 235, 0.22)',
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
export const themeCssVars = (mode: ThemeMode): Record<string, string> => {
  const palette = themePalettes[mode];
  return {
    ...toCssVars(palette.colors),
    ...toCssVars({ shadow: palette.shadows }),
    '--fv-shadow-alpha': palette.shadowAlpha,
  };
};

/**
 * The tokens components import. Every color is a `var()` reference, so the
 * values below are stable across a theme switch — the browser resolves them.
 */
export const flowVizTheme = {
  colors: toVarRefs(darkPalette.colors),

  // Layout tokens
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Border radius
  borderRadius: {
    sm: 6,    // Small elements (chips, etc)
    md: 8,    // Standard (buttons, inputs)
    lg: 12,   // Cards and elevated surfaces
    xl: 16,   // Dialogs and major containers
    xxl: 20,  // Hero elements
  },

  // Effects - blur and shadow
  effects: {
    blur: {
      light: 'blur(10px)',
      standard: 'blur(12px)',
      heavy: 'blur(20px)',
    },
    shadows: toVarRefs(darkPalette.shadows, ['shadow']),
  },

  // Animation
  motion: {
    fast: '0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
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

export const createGlassStyle = (opacity = 0.95) => ({
  background: `rgba(var(--fv-glass-rgb), ${opacity})`,
  border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
  borderRadius: flowVizTheme.borderRadius.lg,
  backdropFilter: flowVizTheme.effects.blur.heavy,
  boxShadow: flowVizTheme.effects.shadows.md,
});


export const createStatusStyle = (status: 'success' | 'error' | 'warning' | 'info') => ({
  backgroundColor: flowVizTheme.colors.status[status].bg,
  color: flowVizTheme.colors.status[status].text,
  border: `1px solid ${flowVizTheme.colors.status[status].border}`,
  borderRadius: flowVizTheme.borderRadius.md,
  backdropFilter: flowVizTheme.effects.blur.light,
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
    borderRadius: '3px',
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
