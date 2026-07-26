import React from 'react';
import { Box } from '@mui/material';
import { keyframes } from '@mui/system';

const streamingAnimation = keyframes`
  0% {
    transform: translateX(-100%);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const pulseGlow = keyframes`
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.8;
  }
`;

interface StreamingProgressBarProps {
  isVisible: boolean;
}

const StreamingProgressBar: React.FC<StreamingProgressBarProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: 'rgba(var(--fv-overlay-rgb), 0.05)',
        overflow: 'hidden',
        zIndex: 1300, // Above AppBar
      }}
    >
      {/* Main streaming line */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(var(--fv-overlay-rgb), 0.6), rgba(var(--fv-overlay-rgb), 0.8), rgba(var(--fv-overlay-rgb), 0.6), transparent)',
          animation: `${streamingAnimation} 2s ease-in-out infinite`,
          width: '30%',
        }}
      />
      
      {/* Subtle background glow */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(var(--fv-overlay-rgb), 0.1), transparent)',
          animation: `${pulseGlow} 3s ease-in-out infinite`,
        }}
      />
    </Box>
  );
};

export default StreamingProgressBar;