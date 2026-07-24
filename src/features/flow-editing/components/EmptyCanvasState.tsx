import React from 'react';
import { Box, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import { flowVizTheme } from '../../../shared/theme/flowviz-theme';

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
          borderRadius: `${flowVizTheme.borderRadius.lg}px`,
          backgroundColor: 'rgba(22, 27, 34, 0.72)',
          border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
          backdropFilter: 'blur(8px)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.45)',
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
            borderRadius: `${flowVizTheme.borderRadius.lg}px`,
            backgroundColor: flowVizTheme.colors.surface.rest,
            border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
            color: flowVizTheme.colors.text.tertiary,
          }}
        >
          <AccountTreeOutlinedIcon />
        </Box>

        <Typography sx={{ color: flowVizTheme.colors.text.primary, fontSize: '1.05rem', fontWeight: 600, mb: 0.75 }}>
          Build your attack flow
        </Typography>
        {/* This is the app's front door now that there is no landing page, so
            it has to say what FlowViz is before it says what to click. */}
        <Typography sx={{ color: flowVizTheme.colors.text.tertiary, fontSize: '0.85rem', maxWidth: 360, lineHeight: 1.6, mb: 2.5 }}>
          {onAnalyze
            ? 'FlowViz turns a threat intelligence report into a MITRE ATT&CK attack flow. Analyze one to generate a diagram, or build it by hand a node at a time.'
            : "Add a node to start, then drag from a node's handle to branch into the next step."}
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
                borderRadius: `${flowVizTheme.borderRadius.md}px`,
                // Fill stays put — surface.active is the brightest step — so the
                // border alone reads as the hover, matching "Add a node" beside it.
                transition: `border-color ${flowVizTheme.motion.fast}`,
                '&:hover': {
                  borderColor: flowVizTheme.colors.surface.border.focus,
                },
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: '1rem' }} />
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
              borderRadius: `${flowVizTheme.borderRadius.md}px`,
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

        <Typography sx={{ color: flowVizTheme.colors.text.disabled, fontSize: '0.72rem', mt: 2 }}>
          Click a node to edit it · double-click to rename
        </Typography>
      </Box>
    </Box>
  );
};

export default EmptyCanvasState;
