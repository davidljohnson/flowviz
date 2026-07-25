import { useEffect, useMemo, useRef } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import CloseIcon from '@mui/icons-material/Close';
import { createScrollbarStyle, flowVizTheme } from '../../../../shared/theme/flowviz-theme';
import { findExcerptRange } from '../utils/sourceHighlight';

interface SourcePanelProps {
  open: boolean;
  /** Article title when the server extracted one; empty for pasted text. */
  title: string;
  text: string;
  /** The selected node's source_excerpt, highlighted and scrolled into view. */
  highlightExcerpt: string | null;
  onClose: () => void;
}

/**
 * Docked reader column for the original article/report behind the canvas.
 * A real layout column rather than an overlay: reading is a long-lived
 * activity, and pushing the canvas over means the graph reflows into the
 * space that is actually visible instead of hiding nodes underneath.
 * Left on purpose: the inspectors own the top-right and the assistant the
 * bottom-right, and reading source against the graph means all must stay
 * visible at once.
 */
export default function SourcePanel({ open, title, text, highlightExcerpt, onClose }: SourcePanelProps) {
  const highlightRef = useRef<HTMLSpanElement | null>(null);

  const range = useMemo(
    () => (highlightExcerpt ? findExcerptRange(text, highlightExcerpt) : null),
    [text, highlightExcerpt],
  );

  useEffect(() => {
    if (range && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [range]);

  if (!open || !text) return null;

  return (
    <Box
      sx={{
        width: 400,
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: flowVizTheme.colors.background.glass,
        borderRight: `1px solid ${flowVizTheme.colors.surface.border.default}`,
        backdropFilter: flowVizTheme.effects.blur.heavy,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <ArticleIcon sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)', flexShrink: 0 }} />
        <Typography
          noWrap
          sx={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)' }}
        >
          {title || 'Source'}
        </Typography>
        <Tooltip title="Close">
          <IconButton size="small" onClick={onClose} sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 1.5,
          fontSize: '0.8rem',
          lineHeight: 1.65,
          color: 'rgba(255, 255, 255, 0.75)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          ...createScrollbarStyle(),
        }}
      >
        {range ? (
          <>
            {text.slice(0, range.start)}
            <Box
              component="span"
              ref={highlightRef}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                outline: '1px solid rgba(255, 255, 255, 0.35)',
                borderRadius: '3px',
                color: 'rgba(255, 255, 255, 0.98)',
              }}
            >
              {text.slice(range.start, range.end)}
            </Box>
            {text.slice(range.end)}
          </>
        ) : (
          text
        )}
      </Box>
    </Box>
  );
}
