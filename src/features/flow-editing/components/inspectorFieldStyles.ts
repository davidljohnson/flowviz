import { flowVizTheme } from '../../../shared/theme/flowviz-theme';

// One source of truth for inspector field styling, shared by the node inspector,
// the edge inspector and the technique autocomplete. Kept here so the fields
// read as one set rather than drifting apart per component — the technique input
// used to carry its own darker fill and heavier border and stood out from the
// rest.

/** Uppercase micro-label sitting above each field. */
export const labelSx = {
  display: 'block',
  color: flowVizTheme.colors.text.tertiary,
  fontSize: '0.68rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  mb: 0.75,
};

/** The field surface itself: faint fill, quiet border that firms up on hover,
 *  brightening to the focus ring when active. */
export const inputSx = {
  width: '100%',
  color: flowVizTheme.colors.text.primary,
  fontSize: '0.85rem',
  lineHeight: 1.5,
  px: 1.25,
  py: 0.9,
  borderRadius: `${flowVizTheme.borderRadius.md}px`,
  backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.03)',
  border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
  transition: flowVizTheme.motion.fast,
  '&:hover': {
    border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
  },
  '&.Mui-focused': {
    border: `1px solid ${flowVizTheme.colors.surface.border.focus}`,
    backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.05)',
  },
};
