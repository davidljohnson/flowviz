import {
    Button,
    ButtonProps,
    CircularProgress,
    IconButton,
    IconButtonProps,
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

// ============= Toolbar Icon Button =============

// Was GlassIconButton, which by the end named nothing that was still true: the
// backdrop-filter went when the surfaces behind it turned opaque, and the fill
// and border went when the row became ghosts. It is the icon-only sibling of
// ToolbarButton, at the same controlSize, so it is named for where it lives.
//
// Ghost at rest: no fill, no visible border, so a row of these reads as a row
// of icons rather than a row of boxes and the eye is free to land on whichever
// one is emphasised. It also gives hover something to say — the old rest fill
// sat at 3% white against an 8% hover, a five-point move on an already-bordered
// chip, which is close to no feedback at all.
//
// The border stays in the box as `transparent` rather than being dropped. It
// keeps one geometry across the row whether or not a given button is
// emphasised, so a caller can turn `borderColor` on for the primary action
// without that button growing 2px taller than its neighbours.
export const ToolbarIconButton = styled(IconButton)<IconButtonProps>({
  color: flowVizTheme.colors.text.secondary,
  backgroundColor: 'transparent',
  border: '1px solid transparent',
  borderRadius: flowVizTheme.borderRadius.md,
  // Fixed box rather than padding around the glyph: the size is the point, and
  // deriving it from padding makes it drift the moment an icon renders at a
  // different step. IconButton already centres its child.
  width: flowVizTheme.controlSize,
  height: flowVizTheme.controlSize,
  padding: 0,
  // Scoped to the properties that actually change, so no future style addition
  // silently animates as well.
  transition: `background-color ${flowVizTheme.motion.fast}, color ${flowVizTheme.motion.fast}, border-color ${flowVizTheme.motion.fast}`,

  '&:hover': {
    color: flowVizTheme.colors.text.primary,
    backgroundColor: flowVizTheme.colors.surface.hover,
  },

  '&:disabled': {
    color: flowVizTheme.colors.text.disabled,
    backgroundColor: 'transparent',
  },
});

// ============= Toolbar Button =============

/**
 * A labelled sibling of ToolbarIconButton, at the same `controlSize` height.
 *
 * For the one action in a toolbar that carries the row's primary verb. An
 * icon-only button asks you to infer the verb from a picture, which is a fine
 * trade for Save or Settings — conventional glyphs, and a tooltip a moment
 * away — but a poor one for the thing the toolbar is mostly there to do.
 *
 * Emphasis is the fill and border, not colour: this system has no primary hue,
 * and being the only filled control in a row of ghosts is enough.
 */
export const ToolbarButton = styled(Button)<ButtonProps>({
  height: flowVizTheme.controlSize,
  minWidth: 'auto',
  padding: '0 10px',
  gap: 6,
  ...flowVizTheme.type.md,
  fontWeight: 500,
  textTransform: 'none',
  color: flowVizTheme.colors.text.secondary,
  backgroundColor: flowVizTheme.colors.surface.rest,
  border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
  borderRadius: flowVizTheme.borderRadius.md,
  boxShadow: 'none',
  transition: `background-color ${flowVizTheme.motion.fast}, color ${flowVizTheme.motion.fast}, border-color ${flowVizTheme.motion.fast}`,

  // Stated rather than inherited. MUI's Button supplies its own :hover fill
  // from the palette, and a pseudo-class beats the unqualified background
  // above it — the same trap that once made HeroSubmitButton flash blue in an
  // otherwise monochrome UI.
  '&:hover': {
    color: flowVizTheme.colors.text.primary,
    backgroundColor: flowVizTheme.colors.surface.hover,
    borderColor: flowVizTheme.colors.surface.border.emphasis,
    boxShadow: 'none',
  },

  '&:disabled': {
    color: flowVizTheme.colors.text.disabled,
    backgroundColor: flowVizTheme.colors.surface.rest,
    borderColor: flowVizTheme.colors.surface.border.subtle,
  },
});

// ============= Dialog Button Variants =============
// ============= Hero Submit Button =============

/**
 * The submit action of a form — Analyze report, Add to canvas, Replace canvas.
 *
 * It used to announce itself: a dot-matrix pattern and a light that swept the
 * width of the button, on hover and on a loop while the request ran. Two
 * problems. It broke the hover rule stated at the top of this file — surfaces
 * lighten, nothing moves — so the one button that mattered most was the one
 * that behaved unlike every other control in the app. And a perpetual sweep
 * reads as decoration rather than status; it says the same thing at second 1
 * and at second 40.
 *
 * So it hovers like ToolbarButton, and says it is busy with the spinner the
 * rest of the app already uses for in-place work — 14px, tertiary ink, beside
 * the label that stays put.
 */
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
        // Scoped to what actually changes, so a later style addition cannot
        // silently start animating — same rule as the toolbar controls.
        transition: `background-color ${flowVizTheme.motion.fast}, color ${flowVizTheme.motion.fast}, border-color ${flowVizTheme.motion.fast}`,
        cursor: 'pointer',
        boxShadow: 'none',
        border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,

        '&:hover': {
          // Stated explicitly, not left to the base declaration. MUI's
          // containedPrimary supplies its own :hover fill from palette.primary
          // — which is accent.blue — and a pseudo-class beats the unqualified
          // background above it, so omitting this is how the button came to
          // flash blue on hover in an otherwise monochrome UI.
          backgroundColor: flowVizTheme.colors.surface.hover,
          borderColor: flowVizTheme.colors.surface.border.emphasis,
          boxShadow: 'none',
        },

        '&:disabled': {
          background: flowVizTheme.colors.background.raised,
          color: flowVizTheme.colors.text.disabled,
          borderColor: flowVizTheme.colors.surface.border.default,
          cursor: 'default',
        },

        ...props.sx,
      }}
    >
      {isLoading && (
        <CircularProgress
          // A status indicator: keeps turning under reduce-motion, since a
          // frozen spinner would claim the request had stopped.
          data-fv-motion="progress"
          size={14}
          thickness={5}
          sx={{ color: flowVizTheme.colors.text.tertiary, flexShrink: 0 }}
        />
      )}
      {children}
    </Button>
  );
};

// ============= Animated Submit Button (Simpler Version) =============
// ============= Danger Button Variant =============
// ============= Compact Button Variants =============
// ============= Export all components =============

export default {
  ToolbarIconButton,
  ToolbarButton,
  HeroSubmitButton
};