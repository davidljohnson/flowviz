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
  color?: 'primary' | 'secondary' | 'tertiary' | 'disabled';
}

export const FlowIcon: React.FC<FlowIconProps> = ({ 
  children, 
  size = 'small', 
  color = 'secondary' 
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
        return flowVizTheme.colors.text.secondary;
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