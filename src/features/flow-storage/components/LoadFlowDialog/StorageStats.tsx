import React from 'react';
import { Box, Typography } from '@mui/material';
import { StorageStats as StorageStatsType } from '../../types/SavedFlow';

interface StorageStatsProps {
  stats: StorageStatsType | null;
  formatFileSize: (bytes: number) => string;
}

const StorageStats: React.FC<StorageStatsProps> = ({ stats, formatFileSize }) => {
  if (!stats) return null;

  return (
    <Box sx={{ 
      mb: 2, 
      p: 2, 
      bgcolor: 'rgba(var(--fv-overlay-rgb), 0.02)', 
      borderRadius: 2,
      border: '1px solid rgba(var(--fv-overlay-rgb), 0.05)'
    }}>
      <Typography variant="caption" sx={{ color: 'rgba(var(--fv-overlay-rgb), 0.6)' }}>
        Storage: {formatFileSize(stats.storageUsed)} • {stats.totalFlows} flows
        {stats.averageNodes && ` • Avg: ${stats.averageNodes} nodes`}
      </Typography>
    </Box>
  );
};

export default StorageStats;