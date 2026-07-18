import { ComponentType } from 'react';
import { Box, Typography } from '@mui/material';
import { createSvgIcon } from '@mui/material/utils';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import DnsRoundedIcon from '@mui/icons-material/DnsRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import GppMaybeRoundedIcon from '@mui/icons-material/GppMaybeRounded';
import { getNodeTypeDisplay } from './nodeUtils';
import { getNodeColor } from './nodeStyles';

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
}

export function NodeHeader({ nodeType }: NodeHeaderProps) {
  const accentColor = getNodeColor(nodeType);
  const Icon = NODE_ICONS[nodeType];

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: '999px',
        backgroundColor: `${accentColor}1A`,
        border: `1px solid ${accentColor}38`,
      }}
    >
      {Icon && (
        <Icon sx={{ fontSize: '0.85rem', color: accentColor }} />
      )}
      <Typography
        variant="caption"
        sx={{
          color: accentColor,
          textTransform: 'uppercase',
          fontSize: '0.65rem',
          letterSpacing: '0.08em',
          fontWeight: 700,
          lineHeight: 1.6,
        }}
      >
        {getNodeTypeDisplay(nodeType)}
      </Typography>
    </Box>
  );
}
