import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Typography, Box } from '@mui/material';
import { getOperatorNodeStyle, getNodeColor } from './shared/nodeStyles';
import { useDetailState } from './shared/presentationScale';
import { NodeHandles } from './shared/NodeHandles';
import { NoteBadge } from './shared/NoteBadge';
import { getNodeTypeDisplay } from './shared/nodeUtils';
import { flowVizTheme } from '../../../../shared/theme/flowviz-theme';

function OperatorNode({ data, selected }: NodeProps) {
  const isNewNode = data.isNewNode;
  const gate = getNodeTypeDisplay(data.type); // 'AND' | 'OR'
  const { tier, pinned } = useDetailState();

  // AFB-style: the pill shows only the gate. The descriptive name stays in
  // data (exports, details panel).
  return (
    <Box
      className="fv-card"
      sx={{
        ...getOperatorNodeStyle(data.type, selected, isNewNode, tier, pinned),
        '--fv-node-glow': `${getNodeColor(data.type)}66`,
      }}
    >
      {/*
        Faded, never unmounted — the pill is `width: max-content`, so this text
        and its padding are what size it. Removing it would collapse the lozenge
        to its 64px minimum and shift the layout on a zoom gesture.
      */}
      <Typography
        component="span"
        sx={{
          color: flowVizTheme.colors.text.primary,
          fontWeight: 700,
          fontSize: '0.8rem',
          letterSpacing: '0.12em',
          lineHeight: 1,
          px: 2.25,
          opacity: tier === 'token' ? 0 : 1,
          transition: pinned ? 'none' : 'opacity 180ms ease',
        }}
      >
        {gate}
      </Typography>
      {/* The pill has no body to tuck the glyph into, so it perches on the
          top-right corner (overflow is visible) with a small backing to stay
          legible against the canvas. */}
      <NoteBadge
        text={typeof data.notes === 'string' ? data.notes : ''}
        sx={{
          top: -7,
          right: -7,
          bottom: 'auto',
          p: '2px',
          borderRadius: flowVizTheme.borderRadius.circle,
          backgroundColor: flowVizTheme.colors.node.pill,
          border: '1px solid rgba(var(--fv-overlay-rgb), 0.12)',
        }}
      />
      <NodeHandles />
    </Box>
  );
}

export default memo(OperatorNode);
