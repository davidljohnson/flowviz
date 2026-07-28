import { Box } from '@mui/material';
import { flowVizTheme, type ThemeMode } from '../theme/flowviz-theme';
import { edgeColors, type EdgeColor, type EdgeColorName } from './edgeAppearance';

interface EdgeColorSwatchesProps {
  mode: ThemeMode;
  value: EdgeColorName;
  onChange: (color: EdgeColor) => void;
  'aria-label'?: string;
}

/**
 * The colour row, shown rather than named — the same argument the shape and
 * style glyphs make. Used for both the flow-wide default and the per-edge
 * override so the two offer the same seven choices in the same order.
 */
function EdgeColorSwatches({ mode, value, onChange, 'aria-label': ariaLabel }: EdgeColorSwatchesProps) {
  return (
    <Box role="group" aria-label={ariaLabel} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
      {edgeColors(mode).map(color => {
        const active = color.name === value;
        return (
          <Box
            key={color.name}
            component="button"
            type="button"
            title={color.label}
            aria-label={color.label}
            aria-pressed={active}
            onClick={() => onChange(color)}
            sx={{
              width: 26,
              height: 26,
              p: 0,
              cursor: 'pointer',
              borderRadius: flowVizTheme.borderRadius.circle,
              backgroundColor: color.swatch,
              border: `2px solid ${active ? 'rgba(var(--fv-overlay-rgb), 0.95)' : 'rgba(var(--fv-overlay-rgb), 0.15)'}`,
              boxShadow: active ? '0 0 0 2px rgba(var(--fv-overlay-rgb), 0.2)' : 'none',
              transition: flowVizTheme.motion.fast,
            }}
          />
        );
      })}
    </Box>
  );
}

export default EdgeColorSwatches;
