import {
    Box,
    Button,
    ButtonProps,
    IconButton,
    IconButtonProps,
    keyframes,
    styled,
} from '@mui/material';
import React from 'react';
import { flowVizTheme } from '../../theme/flowviz-theme';

// ============= Animation Keyframes =============
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
  borderRadius: flowVizTheme.borderRadius.md,
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

// ============= Dialog Button Variants =============
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
        background: flowVizTheme.colors.background.raised,
        borderRadius: flowVizTheme.borderRadius.full,
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
        
        // Shimmer light that sweeps across on hover and while loading. Was a
        // blue gradient; it is the overlay ink now, like everything else.
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
          // Stated explicitly, not left to the base declaration. MUI's
          // containedPrimary supplies its own :hover fill from palette.primary
          // — which is accent.blue — and a pseudo-class beats the unqualified
          // background above it, so omitting this is how the button came to
          // flash blue on hover in an otherwise monochrome UI.
          backgroundColor: flowVizTheme.colors.surface.hover,
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
          background: flowVizTheme.colors.background.raised,
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
// ============= Danger Button Variant =============
// ============= Compact Button Variants =============
// ============= Export all components =============

export default {
  GlassIconButton,
  HeroSubmitButton
};