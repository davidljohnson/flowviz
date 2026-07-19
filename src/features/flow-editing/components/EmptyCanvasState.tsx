import React from 'react';
import { Box, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import { flowVizTheme } from '../../../shared/theme/flowviz-theme';

interface EmptyCanvasStateProps {
  onAddNode: (event: React.MouseEvent<HTMLElement>) => void;
}

/**
 * Centered guidance shown on an empty canvas so a blank flow isn't a dead end.
 * The wrapper ignores pointer events (so panning still works over it); only the
 * CTA is interactive.
 */
const EmptyCanvasState: React.FC<EmptyCanvasStateProps> = ({ onAddNode }) => {
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
        <Typography sx={{ color: flowVizTheme.colors.text.tertiary, fontSize: '0.85rem', maxWidth: 320, lineHeight: 1.5, mb: 2.5 }}>
          Add a node to start, then drag from a node's handle to branch into the next step.
        </Typography>

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
            color: flowVizTheme.colors.text.primary,
            backgroundColor: flowVizTheme.colors.surface.active,
            border: `1px solid ${flowVizTheme.colors.surface.border.emphasis}`,
            borderRadius: `${flowVizTheme.borderRadius.md}px`,
            transition: flowVizTheme.motion.normal,
            '&:hover': {
              border: `1px solid ${flowVizTheme.colors.surface.border.focus}`,
              transform: 'translateY(-1px)',
            },
          }}
        >
          <AddIcon sx={{ fontSize: '1.1rem' }} />
          Add your first node
        </Box>

        <Typography sx={{ color: flowVizTheme.colors.text.disabled, fontSize: '0.72rem', mt: 2 }}>
          Click a node to edit it · double-click to rename
        </Typography>
      </Box>
    </Box>
  );
};

export default EmptyCanvasState;
