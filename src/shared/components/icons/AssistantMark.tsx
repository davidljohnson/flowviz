import { Box } from '@mui/material';

interface AssistantMarkProps {
  /** Bounding-box size in px. */
  size?: number;
  sx?: object;
}

// Equilateral triangle with genuinely rounded corners: each vertex is cut
// 2.8 units short along both edges and bridged with a quadratic curve whose
// control point is the vertex itself, on top of round stroke joins.
const TRI_PATH = 'M13.4 7.03 L17.5 14.17 Q18.9 16.6 16.1 16.6 L7.9 16.6 Q5.1 16.6 6.5 14.17 L10.6 7.03 Q12 4.6 13.4 7.03 Z';

/**
 * The AI assistant mark: a rounded triangle drawn as three stacked ribbon
 * strokes in a silver gradient, each layer gliding a few degrees against the
 * others on its own slow cycle so the form shifts without ever reading as a
 * spinner. Monochrome to sit inside the app's restrained surface language. Reduced motion
 * gets the static mark.
 *
 * Accepts { sx } so it can stand in for an icon component wherever one is
 * expected (command palette, menu rows).
 */
export default function AssistantMark({ size = 16, sx }: AssistantMarkProps) {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        overflow: 'visible',
        '& .fv-tri': {
          fill: 'none',
          stroke: 'url(#fvTriGrad)',
          strokeLinejoin: 'round',
          strokeLinecap: 'round',
          transformOrigin: '50% 60%',
        },
        // Different periods and directions per layer: the composite drift
        // never visibly repeats, which is what keeps it feeling organic
        '& .fv-tri-a': { animation: 'fvTriDriftA 11s ease-in-out infinite alternate' },
        '& .fv-tri-b': { animation: 'fvTriDriftB 8s ease-in-out infinite alternate' },
        '& .fv-tri-c': { animation: 'fvTriDriftC 13s ease-in-out infinite alternate' },
        '@keyframes fvTriDriftA': {
          from: { transform: 'rotate(-5deg) scale(1)' },
          to: { transform: 'rotate(4deg) scale(1.04)' },
        },
        '@keyframes fvTriDriftB': {
          from: { transform: 'rotate(4deg) scale(0.94)' },
          to: { transform: 'rotate(-4deg) scale(0.9)' },
        },
        '@keyframes fvTriDriftC': {
          from: { transform: 'rotate(-2deg) scale(0.86)' },
          to: { transform: 'rotate(3deg) scale(0.9)' },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '& .fv-tri-a, & .fv-tri-b, & .fv-tri-c': { animation: 'none' },
        },
        ...sx,
      }}
    >
      <defs>
        {/* stop-color as a style rather than an attribute: var() resolves in
            CSS only, and the ribbon is drawn in the theme's overlay ink. */}
        <linearGradient id="fvTriGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'rgba(var(--fv-overlay-rgb), 0.95)' }} />
          <stop offset="0.55" style={{ stopColor: 'rgba(var(--fv-overlay-rgb), 0.45)' }} />
          <stop offset="1" style={{ stopColor: 'rgba(var(--fv-overlay-rgb), 0.12)' }} />
        </linearGradient>
      </defs>
      {/* One triangle, three ribbon passes: wide and faint underneath,
          narrow and bright on top */}
      <path className="fv-tri fv-tri-a" d={TRI_PATH} strokeWidth="2.6" opacity="0.22" />
      <path className="fv-tri fv-tri-b" d={TRI_PATH} strokeWidth="1.8" opacity="0.5" />
      <path className="fv-tri fv-tri-c" d={TRI_PATH} strokeWidth="1.2" opacity="0.9" />
    </Box>
  );
}
