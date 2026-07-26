import React, { useState } from 'react';
import { Box, Divider, IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { flowVizTheme } from '../../../shared/theme/flowviz-theme';

export interface InspectorMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface InspectorMenuProps {
  /** Non-destructive actions, rendered above the delete item. */
  items?: InspectorMenuItem[];
  /** Wording for the destructive item, e.g. "Delete node". */
  deleteLabel: string;
  onDelete: () => void;
  /** Icon ink — inspectors that sit on a colored banner pass the banner's contrast color. */
  ink?: string;
  /** Hover wash behind the trigger, matched to whatever surface it sits on. */
  hoverBg?: string;
}

const itemSx = {
  mx: 0.5,
  gap: 1,
  fontSize: '0.82rem',
  borderRadius: `${flowVizTheme.borderRadius.sm}px`,
  transition: flowVizTheme.motion.fast,
};

/**
 * Overflow menu for the inspector headers. Destructive actions live here rather
 * than beside the close button so a mis-aimed dismiss can't delete the object;
 * delete always renders last, behind a divider when other actions exist.
 */
const InspectorMenu: React.FC<InspectorMenuProps> = ({ items = [], deleteLabel, onDelete, ink, hoverBg }) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  return (
    <>
      <Tooltip title="More actions">
        <IconButton
          onClick={(e) => setAnchor(e.currentTarget)}
          size="small"
          sx={{
            color: ink ?? flowVizTheme.colors.text.tertiary,
            borderRadius: `${flowVizTheme.borderRadius.sm}px`,
            transition: flowVizTheme.motion.fast,
            '&:hover': {
              color: ink ?? flowVizTheme.colors.text.primary,
              backgroundColor: hoverBg ?? flowVizTheme.colors.surface.hover,
            },
          }}
        >
          <MoreHorizRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              minWidth: 190,
              backgroundColor: flowVizTheme.colors.menu.dialog,
              backdropFilter: flowVizTheme.effects.blur.heavy,
              border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
              borderRadius: `${flowVizTheme.borderRadius.md}px`,
              boxShadow: flowVizTheme.effects.shadows.md,
            },
          },
        }}
        MenuListProps={{ sx: { py: 0.5 } }}
      >
        {items.map((item) => (
          <MenuItem
            key={item.id}
            onClick={() => { close(); item.onClick(); }}
            sx={{
              ...itemSx,
              color: flowVizTheme.colors.text.primary,
              '&:hover': { backgroundColor: flowVizTheme.colors.surface.hover },
            }}
          >
            {item.icon}
            {item.label}
          </MenuItem>
        ))}

        {items.length > 0 && (
          <Divider sx={{ my: 0.5, borderColor: 'rgba(var(--fv-overlay-rgb), 0.08)' }} />
        )}

        <MenuItem
          onClick={() => { close(); onDelete(); }}
          sx={{
            ...itemSx,
            color: flowVizTheme.colors.status.error.text,
            '&:hover': { backgroundColor: flowVizTheme.colors.status.error.bg },
          }}
        >
          <DeleteOutlineIcon sx={{ fontSize: '1rem' }} />
          {deleteLabel}
          <Box
            component="span"
            sx={{
              ml: 'auto',
              pl: 1.5,
              fontSize: '0.7rem',
              fontWeight: 600,
              color: flowVizTheme.colors.text.disabled,
            }}
          >
            Del
          </Box>
        </MenuItem>
      </Menu>
    </>
  );
};

export default InspectorMenu;
