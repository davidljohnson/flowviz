import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { NodeCard } from './shared/NodeCard';

function ActionNode({ data, selected }: NodeProps) {
  // The tactic reads under the name; the token + name lead the card.
  return <NodeCard data={data} selected={selected} showTacticId />;
}

export default memo(ActionNode);
