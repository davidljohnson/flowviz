import { Box } from '@mui/material';

interface AssistantMarkProps {
  /**
   * Bounding-box size in px. Omit to size from the inherited `font-size`, which
   * is how MUI's icons behave and what the command palette assumes.
   */
  size?: number;
  sx?: object;
}

// A four-point spark with concave sides. Filled rather than outlined: at 16px an
// outlined star closes up into a blob, and the MUI icons this sits beside are
// filled too.
const SPARK_PATH =
  'M12 4.2 C12.5 9.4 14.6 11.5 19.8 12 C14.6 12.5 12.5 14.6 12 19.8 C11.5 14.6 9.4 12.5 4.2 12 C9.4 11.5 11.5 9.4 12 4.2 Z';

/**
 * The AI assistant mark. Deliberately the category-standard spark: it says
 * nothing specific about FlowViz, but it is drawn at the weight and size of
 * every glyph around it, which is what the panel header actually needed. The
 * graph glyph that could have gone here earns more on Analyze — see
 * `FlowMark` — where building the graph is the job.
 *
 * Still, always. It carried a `thinking` twinkle for the assistant panel's
 * header, which meant the panel ran two busy signals at once — the twinkle and
 * the spinner in the message list — and the panel keeps the spinner, since it
 * sits where the reply arrives. An identity mark reporting status is also a
 * poor division of labour: this same glyph anchors the node inspector's assist
 * action and the empty state, where there is nothing to report.
 *
 * Never pins its own colour, so hover and disabled states on any control around
 * it can reach it. Accepts { sx } so it can stand in for an icon component
 * wherever one is expected (command palette, menu rows).
 */
export default function AssistantMark({ size, sx }: AssistantMarkProps) {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
      sx={{
        width: size ?? '1em',
        height: size ?? '1em',
        flexShrink: 0,
        '& .fv-spark': { fill: 'currentColor' },
        ...sx,
      }}
    >
      <path className="fv-spark" d={SPARK_PATH} />
    </Box>
  );
}
