import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import {
    IconButton,
    InputAdornment,
    styled,
    TextField,
    TextFieldProps
} from '@mui/material';
import React from 'react';
import { createScrollbarStyle, flowVizTheme } from '../../theme/flowviz-theme';

// Base search input styling - fully monochrome using theme values
const searchInputStyles = {
  '& .MuiOutlinedInput-root': {
    color: flowVizTheme.colors.text.primary,
    backgroundColor: flowVizTheme.colors.background.panel,
    borderRadius: flowVizTheme.borderRadius.md,
    transition: flowVizTheme.motion.normal,
    
    '&:hover': {
      backgroundColor: flowVizTheme.colors.background.raised,
    },
    
    '&.Mui-focused': {
      backgroundColor: flowVizTheme.colors.background.raised,
    },
    
    // Autofill handling for monochrome consistency
    '& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus': {
      WebkitTextFillColor: flowVizTheme.colors.text.primary,
      WebkitBoxShadow: `0 0 0px 1000px ${flowVizTheme.colors.background.panel} inset`,
      transition: 'background-color 5000s ease-in-out 0s',
      fontSize: 'inherit',
      caretColor: flowVizTheme.colors.text.primary,
    },
  },
  
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: flowVizTheme.colors.surface.border.default,
    borderWidth: 1,
    transition: flowVizTheme.motion.fast,
  },
  
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: flowVizTheme.colors.surface.border.emphasis,
  },
  
  // Monochrome focus - using theme value
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: flowVizTheme.colors.surface.border.focus,
    borderWidth: 1,
  },
  
  // Error state - using theme colors
  '& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline': {
    borderColor: flowVizTheme.colors.status.error.border,
  },
  
  '& .MuiInputLabel-root': {
    color: flowVizTheme.colors.text.secondary,
    
    '&.Mui-focused': {
      color: flowVizTheme.colors.text.primary,
    },
    
    '&.Mui-error': {
      color: flowVizTheme.colors.status.error.text,
    },
  },
  
  '& input::placeholder, & textarea::placeholder': {
    color: flowVizTheme.colors.text.tertiary,
    opacity: 1,
    letterSpacing: '0.01em',
  },
  
  '& .MuiFormHelperText-root': {
    color: flowVizTheme.colors.text.tertiary,
    fontSize: '0.75rem',
    marginTop: `${flowVizTheme.spacing.xs}px`,
    
    '&.Mui-error': {
      color: flowVizTheme.colors.status.error.text,
    },
  },
};

// Compact variant styling for dialogs and smaller spaces
// Standard search input
export const SearchInput = styled(TextField)<TextFieldProps>({
  ...searchInputStyles,
});

// Search input with integrated clear button
interface SearchInputWithClearProps extends Omit<TextFieldProps, 'InputProps'> {
  onClear?: () => void;
  showSearchIcon?: boolean;
}

export const SearchInputWithClear: React.FC<SearchInputWithClearProps> = ({
  value,
  onClear,
  showSearchIcon = true,
  ...props
}) => {
  const hasValue = Boolean(value);
  
  return (
    <SearchInput
      {...props}
      value={value}
      InputProps={{
        startAdornment: showSearchIcon ? (
          <InputAdornment position="start">
            <SearchIcon sx={{ color: flowVizTheme.colors.text.tertiary }} />
          </InputAdornment>
        ) : undefined,
        endAdornment: hasValue && onClear ? (
          <InputAdornment position="end">
            <IconButton
              size="small"
              onClick={onClear}
              sx={{
                color: flowVizTheme.colors.text.tertiary,
                '&:hover': {
                  color: flowVizTheme.colors.text.secondary,
                  backgroundColor: flowVizTheme.colors.surface.hover,
                },
              }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : undefined,
      }}
    />
  );
};

// Compact search input for dialogs
// URL input with larger height
export const SearchInputURL = styled(TextField)<TextFieldProps>({
  ...searchInputStyles,
  '& .MuiOutlinedInput-root': {
    ...searchInputStyles['& .MuiOutlinedInput-root'],
    height: 56,
  },
});

// Multiline search input for text content
export const SearchInputMultiline = styled(TextField)<TextFieldProps>({
  ...searchInputStyles,
  '& .MuiOutlinedInput-root': {
    ...searchInputStyles['& .MuiOutlinedInput-root'],
    '& textarea': {
      ...createScrollbarStyle(`${flowVizTheme.spacing.sm}px`),
    },
  },
});

// Search input with status indicator (for validation states)
// Export all components and utilities
export default {
  SearchInput,
  SearchInputWithClear,
  SearchInputURL,
  SearchInputMultiline
};