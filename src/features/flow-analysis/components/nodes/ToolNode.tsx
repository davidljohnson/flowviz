import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { NodeCard } from './shared/NodeCard';

function ToolNode({ data, selected }: NodeProps) {
  return <NodeCard data={data} selected={selected} showCommandLine />;
}

export default memo(ToolNode);
