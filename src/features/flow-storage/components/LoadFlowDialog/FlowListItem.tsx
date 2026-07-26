import React from 'react';
import {
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Box,
  Typography,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { SavedFlow } from '../../types/SavedFlow';

interface FlowListItemProps {
  flow: SavedFlow;
  isSelected: boolean;
  onClick: () => void;
  onMenuClick: (event: React.MouseEvent<HTMLElement>) => void;
  formatFileSize: (bytes: number) => string;
  formatDate: (date: string) => string;
}

const FlowListItem: React.FC<FlowListItemProps> = ({
  flow,
  isSelected,
  onClick,
  onMenuClick,
  formatFileSize: _formatFileSize,
  formatDate,
}) => {
  return (
    <ListItem
      onClick={onClick}
      sx={{
        borderRadius: 2,
        mb: 1,
        border: isSelected 
          ? '1px solid rgba(var(--fv-overlay-rgb), 0.1)' 
          : '1px solid transparent',
        backgroundColor: isSelected 
          ? 'rgba(var(--fv-overlay-rgb), 0.03)' 
          : 'transparent',
        '&:hover': {
          backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.03)',
          border: '1px solid rgba(var(--fv-overlay-rgb), 0.1)',
        },
        '&.Mui-selected': {
          backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.03) !important',
        },
        '&.Mui-selected:hover': {
          backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.03) !important',
        },
        cursor: 'pointer',
      }}
    >
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: 'rgba(var(--fv-overlay-rgb), 0.95)',
                fontWeight: 500,
                flex: 1,
              }}
            >
              {flow.title}
            </Typography>
          </Box>
        }
        secondary={
          <Box>
            {flow.metadata.description && (
              <Typography 
                variant="body2" 
                sx={{ color: 'rgba(var(--fv-overlay-rgb), 0.7)', mb: 0.5 }}
              >
                {flow.metadata.description}
              </Typography>
            )}
            
            {flow.metadata.tags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5, flexWrap: 'wrap' }}>
                {flow.metadata.tags.slice(0, 3).map(tag => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: '0.6rem',
                      backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.1)',
                      color: 'rgba(var(--fv-overlay-rgb), 0.8)',
                    }}
                  />
                ))}
                {flow.metadata.tags.length > 3 && (
                  <Typography 
                    variant="caption" 
                    sx={{ color: 'rgba(var(--fv-overlay-rgb), 0.5)', alignSelf: 'center' }}
                  >
                    +{flow.metadata.tags.length - 3} more
                  </Typography>
                )}
              </Box>
            )}
            
            <Typography variant="caption" sx={{ color: 'rgba(var(--fv-overlay-rgb), 0.5)' }}>
              {formatDate(flow.metadata.updatedAt)} • Size: {flow.metadata.nodeCount} nodes, {flow.metadata.edgeCount} edges
              {flow.sourceUrl && ` • ${new URL(flow.sourceUrl).hostname}`}
            </Typography>
          </Box>
        }
        secondaryTypographyProps={{
          component: 'div'
        }}
      />
      <ListItemSecondaryAction>
        <IconButton
          size="small"
          onClick={onMenuClick}
          sx={{
            color: 'rgba(var(--fv-overlay-rgb), 0.6)',
            '&:hover': {
              color: 'rgba(var(--fv-overlay-rgb), 0.9)',
              backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.1)',
            }
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );
};

export default FlowListItem;