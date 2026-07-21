import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent, 
  DialogActions,
  Button,
  IconButton,
  styled,
  DialogProps,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { flowVizTheme, createGlassStyle } from '../../theme/flowviz-theme';

// Glass dialog variants
// No default minHeight: forcing every dialog to 40vh left a block of empty
// space under short content (the clear-canvas prompt, the analyse form). Height
// follows content; maxHeight is what keeps a long one scrollable.
const createGlassDialogStyles = ({
  minHeight,
  maxHeight = '80vh',
  minWidth,
  dialogMaxWidth,
}: {
  minHeight?: string;
  maxHeight?: string;
  minWidth?: string;
  dialogMaxWidth?: string;
} = {}) => ({
  '& .MuiPaper-root': {
    ...createGlassStyle(0.95),
    minHeight,
    maxHeight,
    ...(minWidth && { minWidth }),
    ...(dialogMaxWidth && { maxWidth: dialogMaxWidth }),
    margin: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
});

const StyledDialog = styled(Dialog, {
  shouldForwardProp: (prop: string) => !['$minHeight', '$maxHeight', '$minWidth', '$dialogMaxWidth'].includes(prop),
})<{ 
  $minHeight?: string;
  $maxHeight?: string; 
  $minWidth?: string;
  $dialogMaxWidth?: string;
}>(({ $minHeight, $maxHeight, $minWidth, $dialogMaxWidth }: {
  $minHeight?: string;
  $maxHeight?: string; 
  $minWidth?: string;
  $dialogMaxWidth?: string;
}) => 
  createGlassDialogStyles({ 
    minHeight: $minHeight,
    maxHeight: $maxHeight,
    minWidth: $minWidth,
    dialogMaxWidth: $dialogMaxWidth
  })
);

const StyledDialogTitle = styled(DialogTitle)({
  color: flowVizTheme.colors.text.primary,
  fontSize: '1.125rem',
  fontWeight: 600,
  letterSpacing: '-0.02em',
  paddingBottom: flowVizTheme.spacing.md,
  paddingTop: flowVizTheme.spacing.lg,
  paddingLeft: flowVizTheme.spacing.lg,
  paddingRight: flowVizTheme.spacing.xl, // Extra space for close button
  // No border bottom - maintains clean design
  position: 'relative',
});

// DialogContent with proper spacing
const StyledDialogContent = styled(DialogContent)({
  padding: flowVizTheme.spacing.lg,
  paddingTop: `${flowVizTheme.spacing.lg}px !important`,
});

// DialogActions styling (no border separator)
const StyledDialogActions = styled(DialogActions)({
  padding: '16px 24px 20px',
  gap: flowVizTheme.spacing.sm,
  // No border top - maintains clean design
});

// Close button — a bare icon, like the one on the node inspector's header.
// It used to borrow createInteractiveStyle, which framed it in a bordered box
// and dipped it 1px on :active; dismissing a dialog does not need a flourish.
const CloseButton = styled(IconButton)({
  position: 'absolute',
  right: flowVizTheme.spacing.md,
  top: '50%',
  transform: 'translateY(-50%)',
  color: flowVizTheme.colors.text.tertiary,
  padding: flowVizTheme.spacing.sm,
  borderRadius: `${flowVizTheme.borderRadius.sm}px`,
  transition: `color ${flowVizTheme.motion.fast}, background-color ${flowVizTheme.motion.fast}`,
  '&:hover': {
    color: flowVizTheme.colors.text.primary,
    backgroundColor: flowVizTheme.colors.surface.hover,
  },
});

// Button variants
// `px`/`py` are sx shorthand and mean nothing inside styled(); both buttons
// carried them and silently fell back to MUI's default padding. Spelled out
// here so the spacing is the one actually applied.
export const PrimaryButton = styled(Button)({
  background: flowVizTheme.colors.surface.hover,
  color: flowVizTheme.colors.text.primary,
  textTransform: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
  letterSpacing: '0.01em',
  padding: '6px 20px',
  borderRadius: `${flowVizTheme.borderRadius.md}px`,
  border: `1px solid ${flowVizTheme.colors.surface.border.emphasis}`,
  boxShadow: 'none',
  // Surface lightens, nothing moves — same rule as the app bar and the graph
  // controls, so a click doesn't bounce the button under the cursor.
  transition: `background-color ${flowVizTheme.motion.fast}, border-color ${flowVizTheme.motion.fast}`,
  '&:hover': {
    background: flowVizTheme.colors.surface.active,
    border: `1px solid ${flowVizTheme.colors.surface.border.focus}`,
    boxShadow: 'none',
  },
  '&:disabled': {
    background: flowVizTheme.colors.surface.rest,
    color: flowVizTheme.colors.text.disabled,
    borderColor: flowVizTheme.colors.surface.border.subtle,
  }
});

export const SecondaryButton = styled(Button)({
  color: flowVizTheme.colors.text.secondary,
  textTransform: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
  letterSpacing: '0.01em',
  padding: '6px 20px',
  borderRadius: `${flowVizTheme.borderRadius.md}px`,
  border: '1px solid transparent',
  transition: `background-color ${flowVizTheme.motion.fast}, color ${flowVizTheme.motion.fast}`,
  '&:hover': {
    backgroundColor: flowVizTheme.colors.surface.rest,
    color: flowVizTheme.colors.text.primary,
    border: '1px solid transparent',
  }
});

// Main Dialog Component
interface EnhancedDialogProps extends Omit<DialogProps, 'PaperProps'> {
  title?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  children?: React.ReactNode;
  // Glass dialog sizing variants (separate from MUI's maxWidth)
  minHeight?: string;
  maxHeight?: string;
  minWidth?: string;
  dialogMaxWidth?: string; // renamed to avoid conflict with MUI's maxWidth
  // Common dialog presets
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
}

export const EnhancedDialog: React.FC<EnhancedDialogProps> = ({
  title,
  onClose,
  showCloseButton = true,
  children,
  minHeight,
  maxHeight,
  minWidth,
  dialogMaxWidth,
  size,
  ...props
}) => {
  // Handle size presets
  const getSizeProps = () => {
    switch (size) {
      // Widths and ceilings only — a preset says how big a dialog may get, not
      // how much empty space it must reserve.
      case 'small':
        return { minWidth: '420px', dialogMaxWidth: '480px', maxHeight: '60vh' };
      case 'medium':
        return { minWidth: '520px', dialogMaxWidth: '640px', maxHeight: '70vh' };
      case 'large':
        return { minWidth: '640px', dialogMaxWidth: '800px', maxHeight: '80vh' };
      case 'fullscreen':
        return { minHeight: '90vh', maxHeight: '90vh' };
      default:
        return { minHeight, maxHeight, minWidth, dialogMaxWidth };
    }
  };
  
  const sizeProps = getSizeProps();
  
  return (
    <StyledDialog
      {...props}
      $minHeight={sizeProps.minHeight}
      $maxHeight={sizeProps.maxHeight}
      $minWidth={sizeProps.minWidth}
      $dialogMaxWidth={sizeProps.dialogMaxWidth}
      onClose={onClose}
      disableRestoreFocus
      disableEnforceFocus
    >
      {title && (
        <StyledDialogTitle>
          {title}
          {showCloseButton && onClose && (
            <CloseButton onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </CloseButton>
          )}
        </StyledDialogTitle>
      )}
      {children}
    </StyledDialog>
  );
};

// Dialog Content and Actions exports
export { StyledDialogContent as EnhancedDialogContent };
export { StyledDialogActions as EnhancedDialogActions };