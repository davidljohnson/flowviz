import { Handle, Position } from 'reactflow';

const handleStyle = {
  background: 'rgba(255, 255, 255, 0.55)',
  width: 7,
  height: 7,
  border: '2px solid rgba(13, 17, 23, 0.9)',
  opacity: 0.85,
};

export function NodeHandles() {
  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ ...handleStyle, top: -4 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ ...handleStyle, bottom: -4 }}
      />
    </>
  );
}
