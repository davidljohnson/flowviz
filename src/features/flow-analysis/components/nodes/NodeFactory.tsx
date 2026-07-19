import { memo } from 'react';
import { NodeProps } from 'reactflow';
import { isOperator, isAttackAction } from './shared/nodeUtils';
import OperatorNode from './OperatorNode';
import ActionNode from './ActionNode';
import ToolNode from './ToolNode';
import MalwareNode from './MalwareNode';
import GenericNode from './GenericNode';

function NodeFactory(props: NodeProps) {
  const { data } = props;

  // Route to appropriate specialized node component based on type
  if (isOperator(data)) {
    return <OperatorNode {...props} />;
  }

  if (isAttackAction(data)) {
    return <ActionNode {...props} />;
  }

  if (data.type === 'tool') {
    return <ToolNode {...props} />;
  }

  if (data.type === 'malware') {
    return <MalwareNode {...props} />;
  }

  // Default to GenericNode for asset, infrastructure, url, vulnerability, etc.
  return <GenericNode {...props} />;
}

export default memo(NodeFactory);
