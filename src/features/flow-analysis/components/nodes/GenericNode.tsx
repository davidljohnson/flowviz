import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { NodeCard } from './shared/NodeCard';

function GenericNode({ data, selected }: NodeProps) {
  return <NodeCard data={data} selected={selected} />;
}

export default memo(GenericNode);
