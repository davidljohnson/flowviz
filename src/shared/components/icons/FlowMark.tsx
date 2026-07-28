import { Box } from '@mui/material';

interface FlowMarkProps {
  /**
   * Bounding-box size in px. Omit to size from the inherited `font-size`, which
   * is how MUI's icons behave and what `FlowIcon` and the command palette both
   * assume.
   */
  size?: number;
  sx?: object;
}

// Three nodes and two edges: one node fanning into two, the smallest graph the
// app can draw. Discs are filled and edges stroked so the glyph carries the same
// visual weight as the filled MUI icons it sits beside in the app bar. Edges
// stop short of each disc by the disc radius, keeping the gaps even at any size.
const NODE_R = 2.4;
const EDGES = ['M7.02 11.09 L15.98 7.31', 'M7.02 12.91 L15.98 16.69'];

/**
 * The analysis mark: what the app turns a report into. It replaces the document
 * glyph on Analyze, which named the input rather than the outcome — you hand it
 * a report, but what you get back is a graph, and that is the thing worth
 * putting on the bar's primary verb.
 *
 * Never pins its own colour: it inherits, so hover, disabled and selected states
 * on the button around it can reach it.
 */
export default function FlowMark({ size, sx }: FlowMarkProps) {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
      sx={{ width: size ?? '1em', height: size ?? '1em', flexShrink: 0, ...sx }}
    >
      <circle cx="4.8" cy="12" r={NODE_R} fill="currentColor" />
      <circle cx="18.2" cy="6.4" r={NODE_R} fill="currentColor" />
      <circle cx="18.2" cy="17.6" r={NODE_R} fill="currentColor" />
      {EDGES.map((d) => (
        <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      ))}
    </Box>
  );
}
