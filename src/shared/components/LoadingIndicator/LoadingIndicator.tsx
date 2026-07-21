import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/system';

const pulseAnimation = keyframes`
  0%, 100% {
    transform: scale(0.95);
    opacity: 0.5;
  }
  50% {
    transform: scale(1);
    opacity: 0.3;
  }
`;

const breatheEffect = keyframes`
  from, to {
    scale: 1;
  }
  50% {
    scale: 1.2;
  }
`;

export interface LoadingState {
  title: string;
  description: string;
}

export interface LoadingIndicatorProps {
  loadingStates?: LoadingState[];
  intervalDuration?: number;
  isVisible: boolean;
  contentType?: 'url' | 'text'; // Add content type to determine appropriate steps
}

// Loading states for URL-based content (includes image processing)
const urlLoadingStates: LoadingState[] = [
  {
    title: 'Fetching Article',
    description: 'Downloading and extracting content'
  },
  {
    title: 'Processing Images',
    description: 'Analyzing visual content and screenshots'
  },
  {
    title: 'Identifying Patterns',
    description: 'Extracting attack techniques and tactics'
  },
  {
    title: 'Building Flow',
    description: 'Mapping relationships and sequences'
  },
  {
    title: 'Generating Graph',
    description: 'Creating interactive visualization'
  }
];

// Loading states for text-based content (no image processing)
const textLoadingStates: LoadingState[] = [
  {
    title: 'Processing Content',
    description: 'Analyzing provided text content'
  },
  {
    title: 'Identifying Patterns',
    description: 'Extracting attack techniques and tactics'
  },
  {
    title: 'Building Flow',
    description: 'Mapping relationships and sequences'
  },
  {
    title: 'Generating Graph',
    description: 'Creating interactive visualization'
  }
];

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  loadingStates,
  intervalDuration = 3000,
  isVisible,
  contentType = 'url'
}) => {
  // Determine appropriate loading states based on content type
  const contextualStates = loadingStates || (contentType === 'text' ? textLoadingStates : urlLoadingStates);
  const [loadingStateIndex, setLoadingStateIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setLoadingStateIndex((current) => 
        current === contextualStates.length - 1 ? current : current + 1
      );
    }, intervalDuration);
    
    return () => clearInterval(interval);
  }, [contextualStates.length, intervalDuration, isVisible]);

  // Reset state when becoming visible
  useEffect(() => {
    if (isVisible) {
      setLoadingStateIndex(0);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        p: 4,
        background: 'rgba(13, 17, 23, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Subtle top highlight */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
        }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        {/* Pulsing circle with ripple effect */}
        <Box sx={{ position: 'relative' }}>
          <Box
            sx={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              position: 'relative',
              animation: `${pulseAnimation} 1.5s ease-in-out infinite`,
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: '-8px',
                borderRadius: '50%',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                animation: `${breatheEffect} 2s ease-in-out infinite`,
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: '-16px',
                borderRadius: '50%',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                animation: `${breatheEffect} 2s ease-in-out infinite 0.5s`,
              },
            }}
          />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h6"
            sx={{
              background: 'linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.8) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '1.1rem',
              fontWeight: 600,
              mb: 0.5,
              letterSpacing: '-0.02em',
              transition: 'opacity 0.3s ease',
              lineHeight: 1.2,
            }}
          >
            {contextualStates[loadingStateIndex].title}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.875rem',
              letterSpacing: '0.01em',
              transition: 'opacity 0.3s ease',
              lineHeight: 1.4,
            }}
          >
            {contextualStates[loadingStateIndex].description}
          </Typography>

          {/* Progress bar */}
          <Box
            sx={{
              mt: 2.5,
              height: '3px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${((loadingStateIndex + 1) / contextualStates.length) * 100}%`,
                background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.6))',
                borderRadius: 'inherit',
                transition: 'width 0.3s ease-in-out',
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LoadingIndicator;