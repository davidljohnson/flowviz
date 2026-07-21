import {
  TextField,
  FormControl,
  Select,
  MenuItem,
  styled,
  TextFieldProps,
  SelectProps,
  Box,
  Typography,
  Slider,
  SliderProps,
} from '@mui/material';
import { flowVizTheme } from '../../theme/flowviz-theme';

// TextField with monochrome styling
export const EnhancedTextField = styled(TextField)<TextFieldProps>({
  '& .MuiOutlinedInput-root': {
    color: flowVizTheme.colors.text.primary,
    backgroundColor: flowVizTheme.colors.background.glass,
    borderRadius: flowVizTheme.borderRadius.md,
    fontSize: '0.9rem',
    fontWeight: 400,
    transition: flowVizTheme.motion.normal,
    
    '&:hover': {
      backgroundColor: flowVizTheme.colors.background.glassLight,
    },
    
    '&.Mui-focused': {
      backgroundColor: flowVizTheme.colors.background.glassLight,
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
export const EnhancedSelect = styled(Select)<SelectProps>({
  color: flowVizTheme.colors.text.primary,
  backgroundColor: flowVizTheme.colors.background.glass,
  borderRadius: flowVizTheme.borderRadius.md,
  fontSize: '14px',
  fontWeight: 500,
  
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: flowVizTheme.colors.surface.border.default,
  },
  
  '&:hover': {
    backgroundColor: flowVizTheme.colors.background.glassLight,
  },
  
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: flowVizTheme.colors.surface.border.emphasis,
  },
  
  '&.Mui-focused': {
    backgroundColor: flowVizTheme.colors.background.glassLight,
  },
  
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: flowVizTheme.colors.surface.border.focus,
    borderWidth: 1,
  },
  
  '& .MuiSelect-icon': {
    color: flowVizTheme.colors.text.secondary,
  },
});

// MenuItem with monochrome styling
export const EnhancedMenuItem = styled(MenuItem)({
  borderRadius: `${flowVizTheme.borderRadius.sm}px`,
  mb: 0.5,
  padding: `${flowVizTheme.spacing.sm + 2}px ${flowVizTheme.spacing.sm + 6}px`,
  color: flowVizTheme.colors.text.primary,
  fontSize: '14px',
  fontWeight: 500,
  transition: flowVizTheme.motion.fast,
  
  '&:hover': {
    backgroundColor: flowVizTheme.colors.surface.hover,
    color: flowVizTheme.colors.text.primary,
  },
  
  '&.Mui-selected': {
    backgroundColor: flowVizTheme.colors.surface.active,
    
    '&:hover': {
      backgroundColor: flowVizTheme.colors.surface.active,
    }
  }
});

// FormControl with monochrome styling
export const EnhancedFormControl = styled(FormControl)({
  '& .MuiInputLabel-root': {
    color: flowVizTheme.colors.text.secondary,
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: 'transparent',
    
    '&.Mui-focused': {
      color: flowVizTheme.colors.text.primary,
    },
    
    '&.MuiInputLabel-shrink': {
      backgroundColor: 'transparent',
      padding: `0 ${flowVizTheme.spacing.xs}px`,
    },
  },
});

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
      borderRadius: `${flowVizTheme.borderRadius.md}px`,
      backdropFilter: flowVizTheme.effects.blur.standard,
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
      borderRadius: `${flowVizTheme.borderRadius.md}px`,
      backdropFilter: flowVizTheme.effects.blur.standard,
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
export const EnhancedSlider = styled(Slider)<SliderProps>({
  color: flowVizTheme.colors.text.secondary,
  height: 8,
  padding: `${flowVizTheme.spacing.md}px 0`,
  
  '& .MuiSlider-thumb': {
    height: 20,
    width: 20,
    backgroundColor: flowVizTheme.colors.text.primary,
    border: `2px solid ${flowVizTheme.colors.surface.border.focus}`,
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: `0 0 0 8px rgba(255, 255, 255, 0.16)`,
    },
    '&:before': {
      display: 'none',
    },
  },
  
  '& .MuiSlider-track': {
    height: 4,
    backgroundColor: flowVizTheme.colors.surface.border.focus,
    border: 'none',
    borderRadius: flowVizTheme.borderRadius.sm,
  },
  
  '& .MuiSlider-rail': {
    height: 4,
    backgroundColor: flowVizTheme.colors.surface.border.default,
    opacity: 1,
    borderRadius: flowVizTheme.borderRadius.sm,
  },
  
  '& .MuiSlider-mark': {
    backgroundColor: flowVizTheme.colors.surface.border.emphasis,
    height: 8,
    width: 2,
    '&.MuiSlider-markActive': {
      backgroundColor: flowVizTheme.colors.surface.border.focus,
    },
  },
  
  '& .MuiSlider-markLabel': {
    color: flowVizTheme.colors.text.tertiary,
    fontSize: '0.75rem',
    fontWeight: 500,
    '&.MuiSlider-markLabelActive': {
      color: flowVizTheme.colors.text.secondary,
    },
  },
  
  '& .MuiSlider-valueLabel': {
    backgroundColor: flowVizTheme.colors.background.glass,
    border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
    borderRadius: flowVizTheme.borderRadius.sm,
    color: flowVizTheme.colors.text.primary,
    fontSize: '0.75rem',
    fontWeight: 500,
    backdropFilter: flowVizTheme.effects.blur.standard,
    '&:before': {
      borderColor: flowVizTheme.colors.surface.border.subtle,
    },
  },
});