import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Box } from '@mui/material';
import { getBaseNodeStyle } from './shared/nodeStyles';
import { NodeHandles } from './shared/NodeHandles';
import { NodeHeader } from './shared/NodeHeader';
import { NodeContent } from './shared/NodeContent';

function ActionNode({ data, selected }: NodeProps) {
  const isNewNode = data.isNewNode;

  return (
    <Box
      className="fv-card"
      sx={{
        ...getBaseNodeStyle(data.type, selected, isNewNode),
        overflow: 'visible',
        padding: 2
      }}
    >
      <Box sx={{ mb: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <NodeHeader nodeType={data.type} />
      </Box>

      <NodeContent
        data={data}
        showTechniqueLink={true}
        showTacticId={true}
      />

      <NodeHandles />
    </Box>
  );
}

export default memo(ActionNode);
