import { Fragment, useEffect, useMemo, useRef } from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import CloseIcon from '@mui/icons-material/Close';
import { createScrollbarStyle, flowVizTheme } from '../../../../shared/theme/flowviz-theme';
import { findExcerptRanges } from '../utils/sourceHighlight';

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

  // Usually one span; more when the excerpt was welded from several passages,
  // in which case each is marked and the elided text between them is left
  // plain — the gap IS the point.
  const ranges = useMemo(
    () => (highlightExcerpt ? findExcerptRanges(text, highlightExcerpt) : []),
    [text, highlightExcerpt],
  );

  useEffect(() => {
    // The ref is on the first span, so a welded quote scrolls to where its
    // evidence starts rather than to whichever passage happens to be last.
    //
    // `open` is a dependency because the panel keeps its hooks while closed:
    // selecting a node computes the ranges, and by the time the panel is
    // actually opened they have not changed, so keying only on `ranges` left
    // the reader at the top of the article with the match somewhere below.
    if (open && ranges.length > 0 && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [ranges, open]);

  if (!open || !text) return null;

  return (
    <Box
      sx={{
        width: 400,
        flexShrink: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: flowVizTheme.colors.background.panel,
        borderRight: `1px solid ${flowVizTheme.colors.surface.border.default}`,
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
          borderBottom: '1px solid rgba(var(--fv-overlay-rgb), 0.06)',
        }}
      >
        <ArticleIcon sx={{ fontSize: 16, color: flowVizTheme.colors.text.secondary, flexShrink: 0 }} />
        <Typography
          noWrap
          sx={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: flowVizTheme.colors.text.primary }}
        >
          {title || 'Source'}
        </Typography>
        <Tooltip title="Close">
          <IconButton size="small" onClick={onClose} sx={{ color: flowVizTheme.colors.text.tertiary }}>
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
          color: flowVizTheme.colors.text.secondary,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          ...createScrollbarStyle(),
        }}
      >
        {ranges.length > 0 ? (
          <>
            {ranges.map((range, i) => (
              <Fragment key={range.start}>
                {text.slice(i === 0 ? 0 : ranges[i - 1].end, range.start)}
                <Box
                  component="span"
                  ref={i === 0 ? highlightRef : undefined}
                  sx={{
                    backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.16)',
                    outline: '1px solid rgba(var(--fv-overlay-rgb), 0.35)',
                    borderRadius: flowVizTheme.borderRadius.xs,
                    color: flowVizTheme.colors.text.primary,
                  }}
                >
                  {text.slice(range.start, range.end)}
                </Box>
              </Fragment>
            ))}
            {text.slice(ranges[ranges.length - 1].end)}
          </>
        ) : (
          text
        )}
      </Box>
    </Box>
  );
}
