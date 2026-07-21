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
import { getNodeColor, getContrastText } from './nodeStyles';
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
  /** Right-aligned content (e.g. the inspector's delete/close actions). */
  endSlot?: ReactNode;
  /** Larger type label for the inspector header (a title, not a compact chip). */
  prominent?: boolean;
  /**
   * Makes the type label itself the change-type control (inspector only). The
   * banner already *is* the type indicator, so the indicator doubles as the
   * trigger rather than introducing a second place to read the type from. Node
   * cards leave this unset and stay inert.
   */
  onTypeClick?: (event: React.MouseEvent<HTMLElement>) => void;
}

// Full-width banner in the node-type color. Caps the node card (clipped by the
// card's surface) and also tops the inspector, so the two read as the same
// object. The type label (with its icon) uses an auto-picked contrast ink.
export function NodeHeader({ nodeType, endSlot, prominent = false, onTypeClick }: NodeHeaderProps) {
  const accentColor = getNodeColor(nodeType);
  const ink = getContrastText(accentColor);
  const Icon = NODE_ICONS[nodeType];
  // Wash tuned to the banner's own ink so it reads on light and dark accents alike.
  const inkHover = ink === '#ffffff' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.14)';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: endSlot ? 'space-between' : 'flex-start',
        gap: 0.6,
        px: 1.25,
        py: prominent ? 0.85 : 0.6,
        backgroundColor: accentColor,
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
          gap: 0.6,
          minWidth: 0,
          ...(onTypeClick && {
            // Reset the button chrome, then re-earn a hit area around the label.
            appearance: 'none',
            font: 'inherit',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            mx: -0.75,
            px: 0.75,
            py: 0.25,
            borderRadius: `${flowVizTheme.borderRadius.sm}px`,
            transition: `background-color ${flowVizTheme.motion.fast}`,
            '&:hover': { backgroundColor: inkHover },
            // The chevron is the only always-on hint that this is actionable;
            // it firms up on hover rather than appearing from nothing, so the
            // banner doesn't change shape under the cursor.
            '&:hover .fv-type-caret': { opacity: 1 },
          }),
        }}
      >
        {Icon && (
          <Icon sx={{ fontSize: prominent ? '1rem' : '0.85rem', color: ink }} />
        )}
        <Typography
          variant="caption"
          sx={{
            color: ink,
            textTransform: 'uppercase',
            fontSize: prominent ? '0.82rem' : '0.68rem',
            letterSpacing: prominent ? '0.06em' : '0.07em',
            fontWeight: 700,
            lineHeight: 1.6,
          }}
        >
          {getNodeTypeDisplay(nodeType)}
        </Typography>
        {onTypeClick && (
          <KeyboardArrowDownRoundedIcon
            className="fv-type-caret"
            sx={{
              fontSize: '1rem',
              color: ink,
              opacity: 0.55,
              transition: `opacity ${flowVizTheme.motion.fast}`,
            }}
          />
        )}
      </Box>
      {endSlot}
    </Box>
  );
}
