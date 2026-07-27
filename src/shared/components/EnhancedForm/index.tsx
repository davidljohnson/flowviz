import {
    Box,
    styled,
    TextField,
    TextFieldProps,
    Typography
} from '@mui/material';
import { flowVizTheme } from '../../theme/flowviz-theme';

// TextField with monochrome styling
export const EnhancedTextField = styled(TextField)<TextFieldProps>({
  '& .MuiOutlinedInput-root': {
    color: flowVizTheme.colors.text.primary,
    backgroundColor: flowVizTheme.colors.background.panel,
    borderRadius: flowVizTheme.borderRadius.md,
    fontSize: '0.9rem',
    fontWeight: 400,
    transition: flowVizTheme.motion.normal,
    
    '&:hover': {
      backgroundColor: flowVizTheme.colors.background.raised,
    },
    
    '&.Mui-focused': {
      backgroundColor: flowVizTheme.colors.background.raised,
    },
  },
  
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: flowVizTheme.colors.surface.border.default,
    borderWidth: 1,
  },
  
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: flowVizTheme.colors.surface.border.emphasis,
  },
  
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: flowVizTheme.colors.surface.border.focus,
    borderWidth: 1,
  },
  
  '& .MuiInputLabel-root': {
    color: flowVizTheme.colors.text.secondary,
    fontSize: '0.9rem',
    fontWeight: 500,
    
    '&.Mui-focused': {
      color: flowVizTheme.colors.text.primary,
    },
  },
  
  '& .MuiFormHelperText-root': {
    color: flowVizTheme.colors.text.tertiary,
    fontSize: '0.8rem',
    marginTop: flowVizTheme.spacing.xs,
  },
  
  '& .MuiFormHelperText-root.Mui-error': {
    color: flowVizTheme.colors.status.error.text,
  },
});

// Select with monochrome styling
// MenuItem with monochrome styling
// FormControl with monochrome styling
// Form section with elegant spacing
export const FormSection = styled(Box)({
  marginBottom: flowVizTheme.spacing.lg,
  
  '&:last-child': {
    marginBottom: 0,
  }
});

// Form section title
export const FormSectionTitle = styled(Typography)({
  color: flowVizTheme.colors.text.primary,
  fontSize: '1rem',
  fontWeight: 600,
  marginBottom: flowVizTheme.spacing.md,
  letterSpacing: '-0.01em',
});

// Menu props using theme values
export const enhancedMenuProps = {
  PaperProps: {
    sx: {
      background: flowVizTheme.colors.menu.dialog,
      border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
      borderRadius: flowVizTheme.borderRadius.md,
      boxShadow: flowVizTheme.effects.shadows.md,
      minWidth: '150px',
      mt: 1,
    }
  },
  MenuListProps: {
    sx: {
      padding: `${flowVizTheme.spacing.sm - 2}px`,
    }
  }
};

// Menu props for AppBar dropdowns (darker variant)
export const enhancedAppBarMenuProps = {
  PaperProps: {
    sx: {
      background: flowVizTheme.colors.menu.appBar,
      border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
      borderRadius: flowVizTheme.borderRadius.md,
      boxShadow: flowVizTheme.effects.shadows.md,
      minWidth: '150px',
      mt: 1,
    }
  },
  MenuListProps: {
    sx: {
      padding: `${flowVizTheme.spacing.sm - 2}px`,
    }
  }
};

// Enhanced Slider with monochrome styling