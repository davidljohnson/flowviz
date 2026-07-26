import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Typography, Box } from '@mui/material';
import { getOperatorNodeStyle, getNodeColor } from './shared/nodeStyles';
import { NodeHandles } from './shared/NodeHandles';
import { NoteBadge } from './shared/NoteBadge';
import { getNodeTypeDisplay } from './shared/nodeUtils';

function OperatorNode({ data, selected }: NodeProps) {
  const isNewNode = data.isNewNode;
  const gate = getNodeTypeDisplay(data.type); // 'AND' | 'OR'

  // AFB-style: the pill shows only the gate. The descriptive name stays in
  // data (exports, details panel).
  return (
    <Box
      className="fv-card"
      sx={{ ...getOperatorNodeStyle(selected, isNewNode), '--fv-node-glow': `${getNodeColor(data.type)}4D` }}
    >
      <Typography
        component="span"
        sx={{
          color: 'rgba(var(--fv-overlay-rgb), 0.9)',
          fontWeight: 700,
          fontSize: '0.8rem',
          letterSpacing: '0.12em',
          lineHeight: 1,
          px: 2.25,
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
          borderRadius: '50%',
          backgroundColor: '#1a1f27',
          border: '1px solid rgba(var(--fv-overlay-rgb), 0.12)',
        }}
      />
      <NodeHandles />
    </Box>
  );
}

export default memo(OperatorNode);
