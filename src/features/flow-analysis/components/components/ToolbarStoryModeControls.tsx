import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  CropFree,
  Replay
} from '@mui/icons-material';

interface ToolbarStoryModeControlsProps {
  storyState: any;
  controls: any;
  currentStepData: any;
  onResetView: () => void;
}

const ToolbarStoryModeControls: React.FC<ToolbarStoryModeControlsProps> = ({
  storyState,
  controls,
  currentStepData: _currentStepData,
  onResetView
}) => {
  const { isPlaying, currentStep, steps, progress } = storyState;
  const { playStory, pauseStory, nextStep, prevStep, resetStory } = controls;
  
  // Controlled tooltip states to prevent them from getting stuck
  const [tooltipOpen, setTooltipOpen] = useState({
    prev: false,
    play: false,
    next: false,
    fit: false
  });
  
  const handleTooltipClose = () => {
    setTooltipOpen({
      prev: false,
      play: false,
      next: false,
      fit: false
    });
  };

  if (steps.length === 0) return null;

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 2,
      px: 3,
      py: 1,
      background: 'rgba(13, 17, 23, 0.95)',
      borderRadius: '24px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
    }}>
      {/* Minimal Progress Indicator */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1.5,
        minWidth: 80
      }}>
        <Typography
          sx={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontWeight: 500,
            fontSize: '0.875rem',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.01em'
          }}
        >
          {currentStep + 1}/{steps.length}
        </Typography>
        
        <Box sx={{ flex: 1, minWidth: 40 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 3,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                borderRadius: 2,
                transition: 'transform 0.4s ease'
              }
            }}
          />
        </Box>
      </Box>

      {/* Premium Control Strip */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 0.25,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        padding: '4px',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        {/* Previous */}
        <Tooltip 
          title="Previous Step" 
          placement="bottom"
          open={tooltipOpen.prev}
          onOpen={() => setTooltipOpen(prev => ({ ...prev, prev: true }))}
          onClose={() => setTooltipOpen(prev => ({ ...prev, prev: false }))}
          disableInteractive
          enterDelay={500}
          leaveDelay={0}
        >
          <span>
            <IconButton
              onClick={() => {
                handleTooltipClose();
                prevStep();
              }}
              disabled={currentStep <= 0}
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                width: 28,
                height: 28,
                borderRadius: '12px',
                '&:hover': { 
                  color: 'rgba(255, 255, 255, 0.95)',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)'
                },
                '&.Mui-disabled': {
                  color: 'rgba(255, 255, 255, 0.25)'
                },
                transition: 'all 0.15s ease',
              }}
            >
              <SkipPrevious sx={{ fontSize: '18px' }} />
            </IconButton>
          </span>
        </Tooltip>

        {/* Primary Play/Pause/Restart */}
        <Tooltip 
          title={
            currentStep >= steps.length - 1 && !isPlaying 
              ? "Restart Story" 
              : isPlaying 
                ? "Pause" 
                : "Play Story"
          } 
          placement="bottom"
          open={tooltipOpen.play}
          onOpen={() => setTooltipOpen(prev => ({ ...prev, play: true }))}
          onClose={() => setTooltipOpen(prev => ({ ...prev, play: false }))}
          disableInteractive
          enterDelay={500}
          leaveDelay={0}
        >
          <IconButton
            onClick={() => {
              handleTooltipClose();
              if (currentStep >= steps.length - 1 && !isPlaying) {
                resetStory();
              } else if (isPlaying) {
                pauseStory();
              } else {
                playStory();
              }
            }}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: 'rgba(0, 0, 0, 0.8)',
              width: 32,
              height: 28,
              borderRadius: '12px',
              mx: 0.25,
              '&:hover': { 
                backgroundColor: 'rgba(255, 255, 255, 1)',
                color: 'rgba(0, 0, 0, 0.9)',
                transform: 'scale(1.02)'
              },
              transition: 'all 0.15s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            }}
          >
            {currentStep >= steps.length - 1 && !isPlaying 
              ? <Replay sx={{ fontSize: '18px' }} /> 
              : isPlaying 
                ? <Pause sx={{ fontSize: '18px' }} /> 
                : <PlayArrow sx={{ fontSize: '18px' }} />
            }
          </IconButton>
        </Tooltip>

        {/* Next */}
        <Tooltip 
          title="Next Step" 
          placement="bottom"
          open={tooltipOpen.next}
          onOpen={() => setTooltipOpen(prev => ({ ...prev, next: true }))}
          onClose={() => setTooltipOpen(prev => ({ ...prev, next: false }))}
          disableInteractive
          enterDelay={500}
          leaveDelay={0}
        >
          <span>
            <IconButton
              onClick={() => {
                handleTooltipClose();
                nextStep();
              }}
              disabled={currentStep >= steps.length - 1}
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                width: 28,
                height: 28,
                borderRadius: '12px',
                '&:hover': { 
                  color: 'rgba(255, 255, 255, 0.95)',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)'
                },
                '&.Mui-disabled': {
                  color: 'rgba(255, 255, 255, 0.25)'
                },
                transition: 'all 0.15s ease',
              }}
            >
              <SkipNext sx={{ fontSize: '18px' }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Refined Secondary Action */}
      <Tooltip 
        title="Fit View" 
        placement="bottom"
        open={tooltipOpen.fit}
        onOpen={() => setTooltipOpen(prev => ({ ...prev, fit: true }))}
        onClose={() => setTooltipOpen(prev => ({ ...prev, fit: false }))}
        disableInteractive
        enterDelay={500}
        leaveDelay={0}
      >
        <IconButton 
          onClick={() => {
            handleTooltipClose();
            onResetView();
          }}
          sx={{ 
            color: 'rgba(255, 255, 255, 0.5)',
            width: 28,
            height: 28,
            borderRadius: '12px',
            '&:hover': { 
              color: 'rgba(255, 255, 255, 0.8)',
              backgroundColor: 'rgba(255, 255, 255, 0.06)'
            },
            transition: 'all 0.15s ease',
          }}
        >
          {/* Corner brackets, matching the zoom cluster's built-in fit-view glyph. */}
          <CropFree sx={{ fontSize: '16px' }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default ToolbarStoryModeControls;