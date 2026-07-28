import { flowVizTheme } from '../../../shared/theme/flowviz-theme';

// One source of truth for inspector field styling, shared by the node inspector,
// the edge inspector and the technique autocomplete. Kept here so the fields
// read as one set rather than drifting apart per component — the technique input
// used to carry its own darker fill and heavier border and stood out from the
// rest.

/**
 * The label sitting above each field.
 *
 * Sentence case at the settings dialog's row-label treatment. It used to be an
 * uppercase, letter-spaced micro-label, which the dialog borrowed and then
 * dropped — five shouted labels was more emphasis than five field names carry.
 * The stacked layout stays: these panels are 340px, too narrow for the dialog's
 * label-left-control-right rows.
 */
export const labelSx = {
  display: 'block',
  ...flowVizTheme.type.md,
  color: flowVizTheme.colors.text.secondary,
  fontWeight: 500,
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
  borderRadius: flowVizTheme.borderRadius.md,
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
