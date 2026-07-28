import React from 'react';
import {
  ListItem,
  ListItemButton,
  IconButton,
  Box,
  Typography,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { SavedFlow } from '../../types/SavedFlow';
import { flowVizTheme } from '../../../../shared/theme/flowviz-theme';

interface FlowListItemProps {
  flow: SavedFlow;
  onClick: () => void;
  onMenuClick: (event: React.MouseEvent<HTMLElement>) => void;
  formatDate: (date: string) => string;
}

/** The date, right-aligned on the first line. */
const metaSx = {
  flexShrink: 0,
  fontSize: '0.75rem',
  color: flowVizTheme.colors.text.tertiary,
};

/**
 * A saved analysis, as a fixed two-line row.
 *
 * It used to grow with its content — a title, an optional description, up to
 * three tag chips and a `+N more`, then a run-on meta line — which put rows
 * anywhere between 73px and 118px and made the list read as a stack of cards
 * rather than a list. Two lines, always: what it is and when, then what it is
 * about.
 *
 * No node or edge counts. They were inventory rather than a decision input —
 * nobody chooses between two saved analyses by which has more nodes — and they
 * are the same category as the storage line that used to head this dialog:
 * measurable, therefore measured, with nothing depending on the answer.
 *
 * Tags are gone from the row. Nothing in the app can set them — SaveFlowDialog
 * writes `tags: []` unconditionally — so they only ever arrive on an imported
 * file. Search still matches them, so an imported tag remains findable.
 *
 * The row is a ListItemButton rather than a ListItem with onClick, which is
 * what makes it reachable and operable from the keyboard; the overflow button
 * is a sibling via `secondaryAction`, not nested inside it, since a button
 * inside a button is invalid.
 */
const FlowListItem: React.FC<FlowListItemProps> = ({
  flow,
  onClick,
  onMenuClick,
  formatDate,
}) => {
  const host = flow.sourceUrl ? (() => {
    try {
      return new URL(flow.sourceUrl!).hostname;
    } catch {
      return null;
    }
  })() : null;

  const secondary = flow.metadata.description || host;

  return (
    <ListItem
      disablePadding
      secondaryAction={
        <IconButton
          size="small"
          aria-label={`More actions for ${flow.title}`}
          onClick={onMenuClick}
          sx={{
            color: flowVizTheme.colors.text.tertiary,
            '&:hover': {
              color: flowVizTheme.colors.text.primary,
              backgroundColor: flowVizTheme.colors.surface.hover,
            },
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      }
      sx={{ mb: 0.5 }}
    >
      <ListItemButton
        onClick={onClick}
        sx={{
          // Room for the overflow button, which overlays the row's right edge.
          pr: 6,
          py: 1,
          minHeight: 60,
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 0.25,
          borderRadius: flowVizTheme.borderRadius.md,
          border: `1px solid transparent`,
          transition: `background-color ${flowVizTheme.motion.fast}, border-color ${flowVizTheme.motion.fast}`,
          '&:hover': {
            backgroundColor: flowVizTheme.colors.surface.rest,
            borderColor: flowVizTheme.colors.surface.border.subtle,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
          <Typography
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: '0.9rem',
              fontWeight: 500,
              color: flowVizTheme.colors.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {flow.title}
          </Typography>
          <Typography sx={metaSx}>{formatDate(flow.metadata.updatedAt)}</Typography>
        </Box>

        {/* No flex row here any more — with the counts gone this line has one
            child, and the row keeps its height from minHeight rather than from
            always having something to put on the second line. */}
        <Typography
          sx={{
            fontSize: '0.8rem',
            color: flowVizTheme.colors.text.tertiary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {secondary}
        </Typography>
      </ListItemButton>
    </ListItem>
  );
};

export default FlowListItem;
