import { ComponentType } from 'react';
import { Box } from '@mui/material';
import { flowVizTheme } from '../../theme/flowviz-theme';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ComponentType<{ sx?: object }>;
}

interface SegmentedControlProps<T extends string> {
  /** readonly so callers can define their options with `as const`. */
  options: readonly SegmentedOption<T>[];
  /** Current selection. '' / null renders nothing active, for optional fields. */
  value: T | '' | null | undefined;
  onChange: (value: T) => void;
  /** 'md' for the hero input-mode switch, 'sm' for inspector fields. */
  size?: 'sm' | 'md';
  /** Stretch segments to fill the row (inspector fields) vs hug content. */
  fullWidth?: boolean;
  'aria-label'?: string;
}

const SIZES = {
  sm: { px: 1, py: 0.5, fontSize: '0.75rem', gap: 0.5, iconSize: 14 },
  md: { px: 1.75, py: 0.75, fontSize: 13, gap: 0.75, iconSize: 16 },
} as const;

/**
 * The one segmented control. A recessed track with the selected segment raised
 * out of it — so the group reads as a single control with one choice made,
 * rather than as several buttons that happen to sit next to each other.
 *
 * The layering does the work: the track is surface.rest, and because the state
 * colours are translucent they compound over it — an inactive segment is flat,
 * hovering adds another surface.rest (~2x), and the active segment sits at
 * surface.hover. That gives three distinct steps without a single border.
 *
 * Segments are real <button>s, so they're keyboard-focusable and announce their
 * state via aria-pressed.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  fullWidth = false,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  const s = SIZES[size];

  return (
    <Box
      role="group"
      aria-label={ariaLabel}
      sx={{
        display: fullWidth ? 'flex' : 'inline-flex',
        gap: '2px',
        p: '3px',
        backgroundColor: flowVizTheme.colors.surface.rest,
        borderRadius: flowVizTheme.borderRadius.lg,
        border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
      }}
    >
      {options.map(({ value: optionValue, label, icon: Icon }) => {
        const active = value === optionValue;
        return (
          <Box
            key={optionValue}
            component="button"
            type="button"
            aria-pressed={active}
            onClick={() => onChange(optionValue)}
            sx={{
              flex: fullWidth ? 1 : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: s.gap,
              px: s.px,
              py: s.py,
              // Reset the native button chrome before restyling.
              appearance: 'none',
              fontFamily: 'inherit',
              border: 'none',
              fontSize: s.fontSize,
              fontWeight: 500,
              letterSpacing: '0.01em',
              lineHeight: 1.5,
              whiteSpace: 'nowrap',
              borderRadius: flowVizTheme.borderRadius.md,
              cursor: 'pointer',
              userSelect: 'none',
              color: active ? flowVizTheme.colors.text.primary : flowVizTheme.colors.text.tertiary,
              backgroundColor: active ? flowVizTheme.colors.surface.hover : 'transparent',
              transition: `color ${flowVizTheme.motion.fast}, background-color ${flowVizTheme.motion.fast}`,
              '&:hover': {
                color: active ? flowVizTheme.colors.text.primary : flowVizTheme.colors.text.secondary,
                backgroundColor: active
                  ? flowVizTheme.colors.surface.hover
                  : flowVizTheme.colors.surface.rest,
              },
            }}
          >
            {Icon && <Icon sx={{ fontSize: s.iconSize }} />}
            {label}
          </Box>
        );
      })}
    </Box>
  );
}

export default SegmentedControl;
