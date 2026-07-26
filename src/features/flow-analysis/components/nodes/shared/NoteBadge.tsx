import { Box, Tooltip } from '@mui/material';
import StickyNote2RoundedIcon from '@mui/icons-material/StickyNote2Rounded';

interface NoteBadgeProps {
  /** The note text; the badge renders nothing when this is empty. */
  text: string;
  /** Position/appearance overrides — pill nodes anchor it differently. */
  sx?: object;
}

// A quiet glyph a node shows when it carries a note. It stays dim until the
// node is hovered, reveals the note in a tooltip on its own hover, and — via
// the fv-note-badge class the canvas watches for — opens the inspector on the
// notes field when clicked. Kept deliberately unobtrusive: the note is the
// analyst's aside, not part of the node's data.
export function NoteBadge({ text, sx }: NoteBadgeProps) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const preview = trimmed.length > 220 ? `${trimmed.slice(0, 220).trimEnd()}…` : trimmed;

  return (
    <Tooltip
      placement="top"
      arrow
      title={
        <Box sx={{ whiteSpace: 'pre-line', fontSize: '0.72rem', lineHeight: 1.45, maxWidth: 240 }}>
          {preview}
        </Box>
      }
    >
      <Box
        className="fv-note-badge"
        aria-label="View note"
        sx={{
          position: 'absolute',
          bottom: 5,
          right: 6,
          display: 'inline-flex',
          color: 'rgba(var(--fv-overlay-rgb), 0.32)',
          cursor: 'pointer',
          transition: 'color 0.15s ease',
          '&:hover': { color: 'rgba(var(--fv-overlay-rgb), 0.85)' },
          // Brighten a touch when the card itself is hovered, so it reads as
          // part of the node rather than a stray mark.
          '.fv-card:hover &': { color: 'rgba(var(--fv-overlay-rgb), 0.55)' },
          ...sx,
        }}
      >
        <StickyNote2RoundedIcon sx={{ fontSize: 13 }} />
      </Box>
    </Tooltip>
  );
}
