// Shared node styling utilities
export const NODE_COLORS: Record<string, string> = {
  'action': '#3b82f6',
  'tool': '#10b981',
  'malware': '#ef4444',
  'asset': '#f59e0b',
  'infrastructure': '#06b6d4',
  'url': '#8b5cf6',
  'vulnerability': '#f43f5e',
  'AND_operator': '#64748b',
  'OR_operator': '#64748b'
};

export const getNodeColor = (type: string): string => {
  return NODE_COLORS[type] || '#64748b';
};

export const getBaseNodeStyle = (
  type: string,
  isSelected: boolean,
  isNewNode: boolean = false
) => {
  const nodeColor = getNodeColor(type);

  return {
    minWidth: 210,
    maxWidth: 280,
    background: 'linear-gradient(180deg, rgba(32, 38, 47, 0.94) 0%, rgba(19, 24, 31, 0.96) 100%)',
    backdropFilter: 'blur(14px)',
    borderRadius: '14px',
    border: isSelected
      ? `1px solid ${nodeColor}B3`
      : '1px solid rgba(255, 255, 255, 0.09)',
    boxShadow: '0 10px 30px -8px rgba(0, 0, 0, 0.5)',
    transition: isNewNode
      ? 'opacity 0.6s ease-out, transform 0.6s ease-out'
      : 'box-shadow 0.25s ease, border-color 0.25s ease, transform 0.25s ease',
    opacity: isNewNode ? 0 : 1,
    transform: isNewNode ? 'scale(0.9) translateY(-16px)' : 'none',
    cursor: 'grab',
    pointerEvents: 'auto',
    userSelect: 'none',
    '&:active': {
      cursor: 'grabbing',
    },
    zIndex: isSelected ? 10 : 'auto',
    position: 'relative',
    overflow: 'visible',
    '&:hover': {
      border: isSelected
        ? `1px solid ${nodeColor}B3`
        : '1px solid rgba(255, 255, 255, 0.16)',
    }
  };
};

export const getOperatorNodeStyle = (
  isSelected: boolean,
  isNewNode: boolean = false
) => {
  return {
    width: 'max-content',
    minWidth: 64,
    maxWidth: 300,
    height: 40,
    background: 'linear-gradient(180deg, rgba(32, 38, 47, 0.94) 0%, rgba(19, 24, 31, 0.96) 100%)',
    backdropFilter: 'blur(14px)',
    border: isSelected ? '1px solid rgba(255, 255, 255, 0.55)' : '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: '999px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: isNewNode
      ? 'opacity 0.6s ease-out, transform 0.6s ease-out'
      : 'box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease',
    opacity: isNewNode ? 0 : 1,
    transform: isNewNode ? 'scale(0.9) translateY(-16px)' : 'none',
    boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.45)',
    zIndex: isSelected ? 10 : 'auto',
    overflow: 'visible',
    cursor: 'grab',
    '&:active': {
      cursor: 'grabbing',
    },
    '&:hover': {
      border: isSelected ? '1px solid rgba(255, 255, 255, 0.55)' : '1px solid rgba(255, 255, 255, 0.28)',
    }
  };
};
