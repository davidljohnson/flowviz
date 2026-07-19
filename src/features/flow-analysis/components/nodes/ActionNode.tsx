import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { NodeCard } from './shared/NodeCard';

function ActionNode({ data, selected }: NodeProps) {
  return <NodeCard data={data} selected={selected} showTechniqueLink />;
}

export default memo(ActionNode);
