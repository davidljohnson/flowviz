import React from 'react';
import {
  Button,
  IconButton,
  ButtonProps,
  IconButtonProps,
  styled,
  Box,
  keyframes,
} from '@mui/material';
import { flowVizTheme } from '../../theme/flowviz-theme';

// ============= Animation Keyframes =============

const shimmer = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

const dotPattern = keyframes`
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 8px 8px;
  }
`;

// Hover rule for the whole app: nothing moves. Surfaces lighten, borders and
// text brighten, and that is the entire vocabulary — no translateY lift, no
// shadow bloom, no dip on :active. Transitions are scoped to the properties
// that actually change rather than `all`, so a later style addition cannot
// silently start animating. The lift was also a rendering hazard: transform on
// an element carrying backdrop-filter promotes it to its own composited layer
// and re-rasterizes the blur every frame, which showed up as shading flickering
// across the app bar as the cursor swept the button row.

// ============= Glass Icon Button =============

// Matches the graph's zoom controls (.react-flow__controls-button in
// editing.css). The backdrop-filter this once carried bought nothing — the app
// bar behind it is an opaque gradient — so it is gone.
export const GlassIconButton = styled(IconButton)<IconButtonProps>({
  color: flowVizTheme.colors.text.secondary,
  backgroundColor: flowVizTheme.colors.surface.rest,
  border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
  borderRadius: `${flowVizTheme.borderRadius.md}px`,
  padding: `${flowVizTheme.spacing.sm}px`,
  // Scoped to the two properties that actually change, so no future style
  // addition silently animates as well.
  transition: `background-color ${flowVizTheme.motion.fast}, color ${flowVizTheme.motion.fast}`,

  '&:hover': {
    color: flowVizTheme.colors.text.primary,
    backgroundColor: flowVizTheme.colors.surface.hover,
  },

  '&:disabled': {
    color: flowVizTheme.colors.text.disabled,
    backgroundColor: flowVizTheme.colors.surface.rest,
  },
});

// ============= Glass Morph Button =============

export const GlassMorphButton = styled(Button)<ButtonProps>({
  background: flowVizTheme.colors.surface.active,
  color: flowVizTheme.colors.text.primary,
  textTransform: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
  letterSpacing: '0.01em',
  padding: `${flowVizTheme.spacing.sm - 1}px ${flowVizTheme.spacing.lg}px`,
  borderRadius: `${flowVizTheme.borderRadius.md}px`,
  border: `1px solid ${flowVizTheme.colors.surface.border.emphasis}`,
  // Resting fill is already surface.active, the brightest step in the scale, so
  // the border carries the hover on its own.
  transition: `border-color ${flowVizTheme.motion.fast}`,
  boxShadow: 'none',

  '&:hover': {
    background: flowVizTheme.colors.surface.active,
    border: `1px solid ${flowVizTheme.colors.surface.border.focus}`,
    boxShadow: 'none',
  },

  '&:disabled': {
    background: flowVizTheme.colors.surface.rest,
    color: flowVizTheme.colors.text.disabled,
    border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
  },
});

// ============= Dialog Button Variants =============

export const DialogButtonCancel = styled(Button)<ButtonProps>({
  color: flowVizTheme.colors.text.secondary,
  textTransform: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
  letterSpacing: '0.01em',
  padding: `${flowVizTheme.spacing.sm - 1}px ${flowVizTheme.spacing.lg}px`,
  borderRadius: `${flowVizTheme.borderRadius.md}px`,
  border: '1px solid transparent',
  transition: flowVizTheme.motion.normal,
  
  '&:hover': {
    backgroundColor: flowVizTheme.colors.surface.hover,
    color: flowVizTheme.colors.text.primary,
    border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
  },
  
  '&:active': {
    backgroundColor: flowVizTheme.colors.surface.active,
  },
});

export const DialogButtonSecondary = styled(Button)<ButtonProps>({
  color: flowVizTheme.colors.text.secondary,
  textTransform: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
  letterSpacing: '0.01em',
  padding: `${flowVizTheme.spacing.sm - 1}px ${flowVizTheme.spacing.lg}px`,
  borderRadius: `${flowVizTheme.borderRadius.md}px`,
  border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
  transition: flowVizTheme.motion.normal,
  
  '&:hover': {
    backgroundColor: flowVizTheme.colors.surface.hover,
    color: flowVizTheme.colors.text.primary,
    border: `1px solid ${flowVizTheme.colors.surface.border.emphasis}`,
  },
  
  '&:active': {
    backgroundColor: flowVizTheme.colors.surface.active,
  },
});

export const DialogButtonPrimary = styled(Button)<ButtonProps>({
  background: flowVizTheme.colors.surface.active,
  color: flowVizTheme.colors.text.primary,
  textTransform: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
  letterSpacing: '0.01em',
  padding: `${flowVizTheme.spacing.sm - 1}px ${flowVizTheme.spacing.lg}px`,
  borderRadius: `${flowVizTheme.borderRadius.md}px`,
  border: `1px solid ${flowVizTheme.colors.surface.border.emphasis}`,
  // As with GlassMorphButton: the fill is already at the top of the scale, so
  // only the border moves.
  transition: `border-color ${flowVizTheme.motion.fast}`,

  '&:hover': {
    background: flowVizTheme.colors.surface.active,
    border: `1px solid ${flowVizTheme.colors.surface.border.focus}`,
  },

  '&:disabled': {
    background: flowVizTheme.colors.surface.rest,
    color: flowVizTheme.colors.text.disabled,
    border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
  },
});

// ============= Hero Submit Button (Special Animated Button) =============

const moveLight = keyframes`
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(100%);
  }
`;

interface HeroSubmitButtonProps extends ButtonProps {
  isLoading?: boolean;
  children: React.ReactNode;
}

export const HeroSubmitButton: React.FC<HeroSubmitButtonProps> = ({
  isLoading = false,
  children,
  disabled,
  ...props
}) => {
  return (
    <Button
      {...props}
      disabled={disabled || isLoading}
      sx={{
        height: '48px',
        px: '28px',
        minWidth: 'auto',
        background: flowVizTheme.colors.background.glassLight,
        borderRadius: '100px',
        textTransform: 'none',
        fontSize: '15px',
        fontWeight: 500,
        letterSpacing: '0.01em',
        color: flowVizTheme.colors.text.primary,
        transition: flowVizTheme.motion.normal,
        cursor: 'pointer',
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        boxShadow: 'none',
        border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        
        '& .content-wrapper': {
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        },
        
        // Dot pattern overlay for loading/active state
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 2px 2px, ${flowVizTheme.colors.text.tertiary} 0.5px, transparent 0.7px)`,
          backgroundSize: '4px 4px',
          backgroundRepeat: 'repeat',
          opacity: isLoading ? 1 : 0,
          transition: 'opacity 150ms ease',
          pointerEvents: 'none',
          zIndex: 1,
          ...(isLoading && {
            maskImage: 'linear-gradient(90deg, transparent, white 25%, white 75%, transparent)',
            maskSize: '200% 100%',
            animation: `${moveLight} 2s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
          }),
        },
        
        // Shimmer light effect for hover - the special blue gradient effect
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(90deg, transparent, ${flowVizTheme.colors.surface.border.focus} 25%, ${flowVizTheme.colors.surface.border.focus} 75%, transparent)`,
          transform: 'translateX(-100%)',
          opacity: 0,
          transition: 'opacity 150ms ease',
          pointerEvents: 'none',
          zIndex: 0,
        },
        
        '&:hover': {
          border: `1px solid ${flowVizTheme.colors.surface.border.focus}`,

          // Animated dot pattern on hover
          '&::before': {
            opacity: 1,
            maskImage: 'linear-gradient(90deg, transparent, white 25%, white 75%, transparent)',
            maskSize: '200% 100%',
            animation: `${moveLight} 2s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
          },
          
          // Animated shimmer light
          '&::after': {
            opacity: 1,
            animation: `${moveLight} 2s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
          },
        },
        
        '&:disabled': {
          background: flowVizTheme.colors.background.glassLight,
          color: flowVizTheme.colors.text.disabled,
          border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
          cursor: 'default',

          '&:hover': {
            border: `1px solid ${flowVizTheme.colors.surface.border.default}`,

            '&::before': {
              opacity: 0,
              animation: 'none',
            },
            
            '&::after': {
              opacity: 0,
              animation: 'none',
            },
          },
        },
        
        ...props.sx,
      }}
    >
      <Box className="content-wrapper">
        {children}
      </Box>
    </Button>
  );
};

// ============= Animated Submit Button (Simpler Version) =============

interface AnimatedSubmitButtonProps extends ButtonProps {
  isLoading?: boolean;
  children: React.ReactNode;
}

export const AnimatedSubmitButton: React.FC<AnimatedSubmitButtonProps> = ({
  isLoading = false,
  children,
  disabled,
  ...props
}) => {
  return (
    <Button
      {...props}
      disabled={disabled || isLoading}
      sx={{
        height: '48px',
        px: '28px',
        minWidth: 'auto',
        background: flowVizTheme.colors.background.glassLight,
        borderRadius: '100px',
        textTransform: 'none',
        fontSize: '15px',
        fontWeight: 500,
        letterSpacing: '0.01em',
        color: flowVizTheme.colors.text.primary,
        transition: flowVizTheme.motion.normal,
        cursor: 'pointer',
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        boxShadow: 'none',
        border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        
        '& .content-wrapper': {
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        },
        
        // Dot pattern overlay for loading state
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 2px 2px, ${flowVizTheme.colors.text.tertiary} 0.5px, transparent 0.7px)`,
          backgroundSize: '4px 4px',
          backgroundRepeat: 'repeat',
          opacity: isLoading ? 0.3 : 0,
          transition: 'opacity 150ms ease',
          pointerEvents: 'none',
          zIndex: 1,
          ...(isLoading && {
            animation: `${dotPattern} 1s linear infinite`,
          }),
        },
        
        // Shimmer effect for hover
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(90deg, transparent, ${flowVizTheme.colors.surface.border.focus}, transparent)`,
          opacity: 0,
          transform: 'translateX(-100%)',
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none',
          zIndex: 0,
        },
        
        '&:hover': {
          background: flowVizTheme.colors.background.glassLight,
          border: `1px solid ${flowVizTheme.colors.surface.border.emphasis}`,

          '&::after': {
            opacity: 0.1,
            animation: `${shimmer} 0.8s ease-in-out`,
          },
        },

        '&:disabled': {
          background: flowVizTheme.colors.surface.rest,
          color: flowVizTheme.colors.text.disabled,
          border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
          cursor: 'default',

          '&:hover': {
            '&::after': {
              opacity: 0,
              animation: 'none',
            },
          },
        },
        
        ...props.sx,
      }}
    >
      <Box className="content-wrapper">
        {children}
      </Box>
    </Button>
  );
};

// ============= Danger Button Variant =============

export const DangerButton = styled(Button)<ButtonProps>({
  background: flowVizTheme.colors.status.error.bg,
  color: flowVizTheme.colors.status.error.text,
  textTransform: 'none',
  fontSize: '0.9rem',
  fontWeight: 500,
  letterSpacing: '0.01em',
  padding: `${flowVizTheme.spacing.sm - 1}px ${flowVizTheme.spacing.lg}px`,
  borderRadius: `${flowVizTheme.borderRadius.md}px`,
  border: `1px solid ${flowVizTheme.colors.status.error.border}`,
  transition: `background-color ${flowVizTheme.motion.fast}, color ${flowVizTheme.motion.fast}`,
  boxShadow: 'none',

  '&:hover': {
    background: flowVizTheme.colors.status.error.bg,
    color: flowVizTheme.colors.status.error.accent,
    border: `1px solid ${flowVizTheme.colors.status.error.border}`,
    boxShadow: 'none',
  },

  '&:disabled': {
    background: flowVizTheme.colors.surface.rest,
    color: flowVizTheme.colors.text.disabled,
    border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
  },
});

// ============= Compact Button Variants =============

export const CompactIconButton = styled(GlassIconButton)({
  padding: `${flowVizTheme.spacing.xs}px`,
  borderRadius: `${flowVizTheme.borderRadius.sm}px`,
  
  '& .MuiSvgIcon-root': {
    fontSize: '18px',
  },
});

export const CompactButton = styled(GlassMorphButton)({
  fontSize: '0.8rem',
  padding: `${flowVizTheme.spacing.xs}px ${flowVizTheme.spacing.md}px`,
  minHeight: 'unset',
});

// ============= Export all components =============

export default {
  GlassIconButton,
  GlassMorphButton,
  DialogButtonCancel,
  DialogButtonSecondary,
  DialogButtonPrimary,
  HeroSubmitButton,
  AnimatedSubmitButton,
  DangerButton,
  CompactIconButton,
  CompactButton,
};