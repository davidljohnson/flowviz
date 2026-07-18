import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Typography, Box, Tooltip } from '@mui/material';
import { getOperatorNodeStyle } from './shared/nodeStyles';
import { NodeHandles } from './shared/NodeHandles';
import { hasName, getNodeTypeDisplay } from './shared/nodeUtils';

function OperatorNode({ data, selected }: NodeProps) {
  const isNewNode = data.isNewNode;
  const gate = getNodeTypeDisplay(data.type); // 'AND' | 'OR'

  // AFB-style: the pill shows only the gate. The descriptive name stays in
  // data (exports, details panel) and surfaces here as a tooltip.
  const name = hasName(data) ? data.name.trim() : '';

  return (
    <Tooltip title={name} placement="top" disableInteractive>
      <Box
        className="fv-card"
        sx={getOperatorNodeStyle(selected, isNewNode)}
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
    </Tooltip>
  );
}

export default memo(OperatorNode);
