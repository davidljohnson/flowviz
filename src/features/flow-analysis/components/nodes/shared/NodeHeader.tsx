import React, { ComponentType, ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { createSvgIcon } from '@mui/material/utils';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import DnsRoundedIcon from '@mui/icons-material/DnsRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import GppMaybeRoundedIcon from '@mui/icons-material/GppMaybeRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { getNodeTypeDisplay } from './nodeUtils';
import { getIconTileStyle } from './nodeStyles';
import { flowVizTheme } from '../../../../../shared/theme/flowviz-theme';

// Crossed-swords glyph (Material Design Icons "sword-cross") — MUI ships no sword
const SwordCrossIcon = createSvgIcon(
  <path d="M6.2,2.44L18.1,14.34L20.22,12.22L21.63,13.63L19.16,16.1L22.34,19.28C22.73,19.67 22.73,20.3 22.34,20.69L21.63,21.41C21.24,21.8 20.61,21.8 20.22,21.41L17,18.23L14.56,20.7L13.15,19.29L15.27,17.17L3.37,5.27V2.44H6.2M15.89,10L20.63,5.26V2.44H17.8L13.06,7.18L15.89,10M10.94,15L8.11,12.13L5.9,14.34L3.78,12.22L2.37,13.63L4.84,16.1L1.66,19.29C1.27,19.68 1.27,20.31 1.66,20.7L2.37,21.41C2.76,21.8 3.39,21.8 3.78,21.41L7,18.23L9.44,20.7L10.85,19.29L8.73,17.17L10.94,15Z" />,
  'SwordCross'
);

const NODE_ICONS: Record<string, ComponentType<{ sx?: object }>> = {
  'action': SwordCrossIcon,
  'attack-action': SwordCrossIcon,
  'tool': BuildRoundedIcon,
  'malware': BugReportRoundedIcon,
  'asset': StorageRoundedIcon,
  'infrastructure': DnsRoundedIcon,
  'url': LinkRoundedIcon,
  'vulnerability': GppMaybeRoundedIcon,
};

interface NodeHeaderProps {
  nodeType: string;
  /**
   * ATT&CK id, shown beside the type label on technique cards. It rides the
   * header rather than a footer row of its own: the id identifies the node, so
   * it belongs with the type, and the name keeps the body to itself.
   */
  techniqueId?: string;
  /** Right-aligned content (e.g. the inspector's delete/close actions). */
  endSlot?: ReactNode;
  /** Larger token + label for the inspector header. */
  prominent?: boolean;
  /**
   * Makes the token + type name the change-type control (inspector only). The
   * token already *is* the type indicator, so it doubles as the trigger rather
   * than introducing a second place to read the type from.
   */
  onTypeClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

// The type "token": the small colored tile holding the icon. It is the card's
// and the inspector's shared moment of color, so the two read as one object.
export function TypeToken({ nodeType, size, sx }: { nodeType: string; size: number; sx?: object }) {
  const Icon = NODE_ICONS[nodeType];
  if (!Icon) return null;
  return (
    <Box className="fv-type-token" sx={{ ...getIconTileStyle(nodeType, size), ...sx }}>
      <Icon sx={{ fontSize: `${Math.round(size * 0.58)}px` }} />
    </Box>
  );
}

// Inspector header: the token + type name, doubling as the change-type control,
// with the panel actions pushed to the right. Node cards do not use this — they
// set the node's name inline with the token instead, so the name leads.
export function NodeHeader({ nodeType, techniqueId, endSlot, prominent = false, onTypeClick }: NodeHeaderProps) {
  const labelColor = 'rgba(var(--fv-overlay-rgb), 0.5)';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: endSlot ? 'space-between' : 'flex-start',
        gap: 0.5,
      }}
    >
      <Box
        {...(onTypeClick && {
          component: 'button' as const,
          onClick: onTypeClick,
          title: 'Change type',
        })}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          minWidth: 0,
          ...(onTypeClick && {
            // Reset the button chrome, then re-earn a hit area around the token.
            appearance: 'none',
            font: 'inherit',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            mx: -0.5,
            px: 0.5,
            py: 0.25,
            borderRadius: flowVizTheme.borderRadius.sm,
            transition: `background-color ${flowVizTheme.motion.fast}`,
            '&:hover': { backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.05)' },
            // The chevron is the only always-on hint that this is actionable; it
            // firms up on hover rather than appearing from nothing.
            '&:hover .fv-type-caret': { opacity: 1 },
          }),
        }}
      >
        <TypeToken nodeType={nodeType} size={prominent ? 28 : 22} />
        <Typography
          sx={{
            color: labelColor,
            textTransform: 'uppercase',
            fontSize: prominent ? '0.72rem' : '0.6rem',
            letterSpacing: '0.1em',
            fontWeight: 600,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {getNodeTypeDisplay(nodeType)}
        </Typography>
        {onTypeClick && (
          <KeyboardArrowDownRoundedIcon
            className="fv-type-caret"
            sx={{
              fontSize: '1rem',
              color: labelColor,
              opacity: 0.55,
              transition: `opacity ${flowVizTheme.motion.fast}`,
            }}
          />
        )}
      </Box>
      {/* Anchored to the header's far edge rather than trailing the type label.
          Shoulder to shoulder the two invited a comparison they could never
          win — one is tracked-out uppercase, the other digits — so they read
          as two voices however carefully they were matched. Apart, each owns
          an end of the row: type on the left, identity on the right. It keeps
          the label's family, size, weight and tracking so they are the same
          class of text, with tabular figures so ids hold one width down a
          column of cards. Sits outside the type box so it is not swept into
          the change-type control, and above the note badge's bottom corner. */}
      {techniqueId && (
        <Typography
          sx={{
            ml: 'auto',
            pl: 1,
            color: 'rgba(var(--fv-overlay-rgb), 0.55)',
            fontSize: prominent ? '0.72rem' : '0.6rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            lineHeight: 1.2,
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {techniqueId}
        </Typography>
      )}
      {endSlot}
    </Box>
  );
}
