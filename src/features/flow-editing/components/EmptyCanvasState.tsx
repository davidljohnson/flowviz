import React from 'react';
import { Box, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import { flowVizTheme, shadowInk } from '../../../shared/theme/flowviz-theme';

interface EmptyCanvasStateProps {
  onAddNode: (event: React.MouseEvent<HTMLElement>) => void;
  /** Opens the Analyse dialog. Omitted where analysis isn't available. */
  onAnalyze?: () => void;
}

/**
 * Centered guidance shown on an empty canvas so a blank flow isn't a dead end.
 * The wrapper ignores pointer events (so panning still works over it); only the
 * CTA is interactive.
 */
const EmptyCanvasState: React.FC<EmptyCanvasStateProps> = ({ onAddNode, onAnalyze }) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        px: 3,
      }}
    >
      {/* A crisp, contained card so the copy reads cleanly against the grid
          instead of the dots running through the text. */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          px: 5,
          py: 4.5,
          borderRadius: flowVizTheme.borderRadius.lg,
          backgroundColor: 'rgba(var(--fv-raised-rgb), 0.72)',
          border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
          boxShadow: `0 24px 64px ${shadowInk(0.45)}`,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            mb: 2.5,
            borderRadius: flowVizTheme.borderRadius.lg,
            backgroundColor: flowVizTheme.colors.surface.rest,
            border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
            color: flowVizTheme.colors.text.tertiary,
          }}
        >
          {/* Decorative, and deliberately not FlowMark: that mark identifies the
              Analyze action up in the bar, and repeating it here — beside a
              button that runs the same action — put three copies of one glyph
              in a single viewport. */}
          <AccountTreeOutlinedIcon />
        </Box>

        <Typography sx={{ color: flowVizTheme.colors.text.primary, fontSize: '1.05rem', fontWeight: 600, mb: 0.75 }}>
          Build your attack flow
        </Typography>
        {/* One line, tops - the buttons say the rest. */}
        <Typography sx={{ color: flowVizTheme.colors.text.tertiary, fontSize: '0.85rem', maxWidth: 360, lineHeight: 1.6, mb: 2.5 }}>
          {onAnalyze
            ? 'Turn a threat report into an ATT&CK flow, or build one by hand.'
            : 'Add a node, then drag from its handle to branch.'}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Analysis leads: it is what the product does, and it was the
              landing page's primary call to action before this replaced it. */}
          {onAnalyze && (
            <Box
              component="button"
              onClick={onAnalyze}
              sx={{
                pointerEvents: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                cursor: 'pointer',
                px: 2,
                py: 1,
                fontSize: '0.85rem',
                fontWeight: 600,
                color: flowVizTheme.colors.text.primary,
                backgroundColor: flowVizTheme.colors.surface.active,
                border: `1px solid ${flowVizTheme.colors.surface.border.emphasis}`,
                borderRadius: flowVizTheme.borderRadius.md,
                // Fill stays put — surface.active is the brightest step — so the
                // border alone reads as the hover, matching "Add a node" beside it.
                transition: `border-color ${flowVizTheme.motion.fast}`,
                '&:hover': {
                  borderColor: flowVizTheme.colors.surface.border.focus,
                },
              }}
            >
              Analyze a report
            </Box>
          )}

          <Box
            component="button"
            onClick={onAddNode}
            sx={{
              pointerEvents: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              cursor: 'pointer',
              px: 2,
              py: 1,
              fontSize: '0.85rem',
              fontWeight: 600,
              // Filled when it is the only option, outlined when analysis
              // sits beside it and takes the emphasis.
              color: onAnalyze ? flowVizTheme.colors.text.secondary : flowVizTheme.colors.text.primary,
              backgroundColor: onAnalyze ? 'transparent' : flowVizTheme.colors.surface.active,
              border: `1px solid ${onAnalyze ? flowVizTheme.colors.surface.border.default : flowVizTheme.colors.surface.border.emphasis}`,
              borderRadius: flowVizTheme.borderRadius.md,
              transition: `color ${flowVizTheme.motion.fast}, border-color ${flowVizTheme.motion.fast}`,
              '&:hover': {
                color: flowVizTheme.colors.text.primary,
                borderColor: flowVizTheme.colors.surface.border.emphasis,
              },
            }}
          >
            <AddIcon sx={{ fontSize: '1.1rem' }} />
            Add a node
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default EmptyCanvasState;
