import { Box } from '@mui/material';
import { themePalettes, type ThemeMode } from '../theme/flowviz-theme';

/**
 * How an edge looks, in one place.
 *
 * The settings dialog sets the default for a whole flow and the edge inspector
 * overrides it per edge. They are two controls over the same three properties,
 * so they share the option lists, the glyphs and the colour table rather than
 * each keeping their own — which is how they drifted into offering three
 * colours in one panel and seven in the other.
 */

/**
 * A bit of edge drawn as a glyph, so the choice shows the thing rather than
 * naming it.
 *
 * Each family varies exactly one property and holds the rest fixed, which is
 * what keeps them readable at 14px and keeps the two rows from being confused
 * for one another:
 *   shape — three different routings, same stroke, all corner to corner.
 *   style — same neutral horizontal, different stroke. Deliberately NOT the
 *           diagonal: reusing shape's straight run would draw the same glyph in
 *           two rows to mean two different things.
 *
 * Sized in `em` so it inherits the segment's `fontSize` like an icon font would;
 * SegmentedControl passes the icon slot nothing but a font size.
 */
const edgeGlyph = (path: string, dash?: string) => {
  const Glyph = ({ sx }: { sx?: object }) => (
    <Box
      component="svg"
      viewBox="0 0 16 10"
      fill="none"
      aria-hidden
      sx={{ width: '1.6em', height: '1em', flexShrink: 0, ...sx }}
    >
      <Box
        component="path"
        d={path}
        sx={{
          stroke: 'currentColor',
          strokeWidth: 1.5,
          // Round caps soften the shape glyphs' ends and corners, but they'd
          // ruin a dashed one: a cap adds strokeWidth/2 to each end of every
          // dash, so `3 3` would paint as 4.5 on / 1.5 off and read very nearly
          // solid at this size. Butt caps keep the 1:1 rhythm the real edges
          // draw with (`5 5`, in StreamingFlowVisualization).
          strokeLinecap: dash ? 'butt' : 'round',
          strokeLinejoin: 'round',
          ...(dash && { strokeDasharray: dash }),
        }}
      />
    </Box>
  );
  return Glyph;
};

const CurvedGlyph = edgeGlyph('M1 8 C 6 8, 10 2, 15 2');
const StraightGlyph = edgeGlyph('M1 8 L15 2');
const SteppedGlyph = edgeGlyph('M1 8 H8 V2 H15');

const SolidGlyph = edgeGlyph('M1 5 H15');
const DashedGlyph = edgeGlyph('M1 5 H15', '3 3');

export const EDGE_SHAPE_OPTIONS = [
  { value: 'smooth', label: 'Curved', icon: CurvedGlyph },
  { value: 'straight', label: 'Straight', icon: StraightGlyph },
  { value: 'step', label: 'Stepped', icon: SteppedGlyph },
] as const;

export const EDGE_STYLE_OPTIONS = [
  { value: 'solid', label: 'Solid', icon: SolidGlyph },
  { value: 'dashed', label: 'Dashed', icon: DashedGlyph },
] as const;

/** The dash pattern real edges draw with, so `dashed` means one thing. */
export const EDGE_DASH_ARRAY = '5 5';

export type EdgeColorName = 'default' | 'mono' | 'blue' | 'green' | 'amber' | 'red' | 'purple';

export interface EdgeColor {
  name: EdgeColorName;
  label: string;
  /** Stroke for the line. */
  line: string;
  /** Opaque marker colour, so the line doesn't show through the arrowhead. */
  arrow: string;
  /** What the swatch button paints — `line` is too faint to read at 26px. */
  swatch: string;
}

/**
 * The seven edge colours, resolved against the live palette.
 *
 * The first two are neutrals drawn in whichever ink contrasts with the canvas,
 * so they're built from the palette rather than fixed: on a light canvas "mono"
 * is graphite, not white. The named hues are the same in both themes.
 */
export const edgeColors = (mode: ThemeMode): EdgeColor[] => {
  const { canvas } = themePalettes[mode].colors;
  return [
    { name: 'default', label: 'Default', line: 'rgba(var(--fv-overlay-rgb), 0.55)', arrow: canvas.edgeArrow, swatch: 'rgba(var(--fv-overlay-rgb), 0.55)' },
    { name: 'mono', label: 'Mono', line: 'rgba(var(--fv-overlay-rgb), 0.9)', arrow: canvas.edgeArrowStrong, swatch: canvas.edgeArrowStrong },
    { name: 'blue', label: 'Blue', line: '#3b82f6', arrow: '#3b82f6', swatch: '#3b82f6' },
    { name: 'green', label: 'Green', line: '#10b981', arrow: '#10b981', swatch: '#10b981' },
    { name: 'amber', label: 'Amber', line: '#f59e0b', arrow: '#f59e0b', swatch: '#f59e0b' },
    { name: 'red', label: 'Red', line: '#ef4444', arrow: '#ef4444', swatch: '#ef4444' },
    { name: 'purple', label: 'Purple', line: '#8b5cf6', arrow: '#8b5cf6', swatch: '#8b5cf6' },
  ];
};

/**
 * Read a stored colour name.
 *
 * The neutral was written as 'white' for as long as the setting has existed,
 * which was only ever accurate on a dark canvas — it renders as graphite on a
 * light one. It is 'mono' now, in both the stored value and the label, and this
 * translates what is already in people's localStorage and saved flows. Anything
 * unrecognised falls back rather than leaving an edge with no colour at all.
 */
export const toEdgeColorName = (stored: string | null | undefined): EdgeColorName => {
  if (stored === 'white') return 'mono';
  const known: EdgeColorName[] = ['default', 'mono', 'blue', 'green', 'amber', 'red', 'purple'];
  return known.includes(stored as EdgeColorName) ? (stored as EdgeColorName) : 'default';
};

/** Look a colour up by name, falling back to the default rather than throwing. */
export const edgeColorByName = (mode: ThemeMode, name: string | null | undefined): EdgeColor => {
  const wanted = toEdgeColorName(name);
  const colors = edgeColors(mode);
  return colors.find(c => c.name === wanted) ?? colors[0];
};

/**
 * Name the colour an edge is currently drawn in.
 *
 * A per-edge override stores the resolved stroke rather than a name, so this
 * reads it back off the palette. An edge painted before a colour was renamed —
 * or by a theme it wasn't drawn in — matches nothing and reads as the default,
 * which is what it looks like anyway.
 */
export const edgeColorNameFromStroke = (mode: ThemeMode, stroke: string | undefined): EdgeColorName =>
  edgeColors(mode).find(c => c.line === stroke)?.name ?? 'default';
