import { Box, IconButton, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AssistantMark from '../../../shared/components/icons/AssistantMark';
import { flowVizTheme } from '../../../shared/theme/flowviz-theme';

interface SelectionBarProps {
  /** How many nodes are selected; the bar only appears above one. */
  count: number;
  onAskAbout: () => void;
  onClear: () => void;
}

/**
 * What a multi-selection can do, floating clear of both side panels.
 *
 * Bottom-centre because the corners are taken: the inspector owns top-right and
 * the assistant owns bottom-right, and a bar that appeared under either would
 * fight the panel it belongs to.
 *
 * Only from two nodes up. At one the inspector is already open on that node and
 * carries the same action in its overflow menu, so a bar would be a second
 * place to do one thing.
 */
export default function SelectionBar({ count, onAskAbout, onClear }: SelectionBarProps) {
  if (count < 2) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: flowVizTheme.zIndex.canvasPanel,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        height: 34,
        pl: 1.5,
        pr: 0.5,
        backgroundColor: flowVizTheme.colors.background.panel,
        border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
        borderRadius: flowVizTheme.borderRadius.md,
        boxShadow: flowVizTheme.effects.shadows.lg,
      }}
    >
      <Box component="span" sx={{ ...flowVizTheme.type.sm, color: flowVizTheme.colors.text.primary }}>
        {count} selected
      </Box>
      <Box sx={{ width: '1px', height: 16, backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.1)' }} />
      <Box
        component="button"
        onClick={onAskAbout}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.625,
          height: 24,
          px: 1,
          cursor: 'pointer',
          borderRadius: flowVizTheme.borderRadius.sm,
          ...flowVizTheme.type.xs,
          color: flowVizTheme.colors.text.primary,
          backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.06)',
          border: '1px solid rgba(var(--fv-overlay-rgb), 0.12)',
          transition: flowVizTheme.motion.fast,
          '&:hover': {
            backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.1)',
            borderColor: 'rgba(var(--fv-overlay-rgb), 0.28)',
          },
        }}
      >
        <AssistantMark size={12} />
        Ask about these
      </Box>
      <Tooltip title="Clear selection">
        <IconButton
          size="small"
          onClick={onClear}
          aria-label="Clear selection"
          sx={{
            width: 24,
            height: 24,
            p: 0,
            color: flowVizTheme.colors.text.tertiary,
            '&:hover': { color: flowVizTheme.colors.text.primary },
          }}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
