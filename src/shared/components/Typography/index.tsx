import {
    DialogContentText,
    styled
} from '@mui/material';
import React from 'react';
import { flowVizTheme } from '../../theme/flowviz-theme';

// ============= Dialog Content Text Component =============

export const FlowDialogContent = styled(DialogContentText)({
  ...flowVizTheme.type.lg,
  color: flowVizTheme.colors.text.secondary,
  // Prose, not UI text — it gets a looser measure than the step's default.
  lineHeight: 1.6,
});

// ============= Caption Text Variants =============
// Special uppercase caption variant used in nodes and headers
// ============= Small Text Variants =============
// Special tiny text for node content
// ============= Status Text Components =============
// ============= Section Headers =============
// ============= Link Text Component =============
// ============= Gradient Text Component =============
// ============= Icon Text Wrapper =============
// ============= Icon Size Wrapper =============

interface FlowIconProps {
  children: React.ReactElement;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  /**
   * Defaults to `inherit`, and should stay there inside anything with hover,
   * disabled or selected states.
   *
   * Pinning a token here writes `color` onto the <svg> itself, and an explicit
   * value on the child is not something a parent's `&:hover { color }` can
   * reach — the icon simply never inherits. That is how the app bar's Save
   * button came to render identically whether or not it was disabled: the
   * button went to `text.disabled`, the glyph inside it stayed at
   * `text.secondary`, and the same silence swallowed every hover in the row.
   *
   * The named steps are for icons that sit on a plain surface and genuinely
   * need to be a step quieter than their surroundings.
   */
  color?: 'inherit' | 'primary' | 'secondary' | 'tertiary' | 'disabled';
}

export const FlowIcon: React.FC<FlowIconProps> = ({
  children,
  size = 'small',
  color = 'inherit'
}) => {
  const getSize = () => {
    switch (size) {
      case 'tiny':
        return '16px';
      case 'small':
        return '18px';
      case 'medium':
        return '20px';
      case 'large':
        return '24px';
      default:
        return '18px';
    }
  };

  const getColor = () => {
    switch (color) {
      case 'primary':
        return flowVizTheme.colors.text.primary;
      case 'secondary':
        return flowVizTheme.colors.text.secondary;
      case 'tertiary':
        return flowVizTheme.colors.text.tertiary;
      case 'disabled':
        return flowVizTheme.colors.text.disabled;
      default:
        return 'inherit';
    }
  };

  return React.cloneElement(children, {
    sx: {
      fontSize: getSize(),
      color: getColor(),
      ...children.props.sx,
    },
  });
};

// ============= Export all components =============

export default {
  FlowDialogContent,
  FlowIcon,
};