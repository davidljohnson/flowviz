import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Typography, Box } from '@mui/material';
import { getOperatorNodeStyle, getNodeColor } from './shared/nodeStyles';
import { NodeHandles } from './shared/NodeHandles';
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
          color: 'rgba(255, 255, 255, 0.9)',
          fontWeight: 700,
          fontSize: '0.8rem',
          letterSpacing: '0.12em',
          lineHeight: 1,
          px: 2.25,
        }}
      >
        {gate}
      </Typography>
      <NodeHandles />
    </Box>
  );
}

export default memo(OperatorNode);
