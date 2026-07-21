import { useState } from 'react';
import {
  AppBar as MuiAppBar,
  Box,
  Toolbar,
  Typography,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import ImageIcon from '@mui/icons-material/Image';
import CodeIcon from '@mui/icons-material/Code';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SettingsIcon from '@mui/icons-material/Settings';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { keyframes } from '@mui/system';
import ToolbarStoryModeControls from '../../flow-analysis/components/components/ToolbarStoryModeControls';
import { ActionMenu } from '../../../shared/components/Dropdown';
import { GlassIconButton } from '../../../shared/components/Button';
import { FlowIcon } from '../../../shared/components/Typography';

const streamingGradient = keyframes`
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
`;

interface AppBarProps {
  isStreaming: boolean;
  exportFunction: ((format: 'png' | 'json' | 'afb' | 'flowviz') => void) | null;
  storyModeData: any;
  showGraphActions: boolean;
  onNewSearch: () => void;
  onDownloadClick: (format: 'png' | 'json' | 'afb' | 'flowviz') => void;
  onSaveClick: () => void;
  onLoadClick: () => void;
  onSettingsClick: () => void;
}

export default function AppBar({
  isStreaming,
  exportFunction,
  storyModeData,
  showGraphActions,
  onNewSearch,
  onDownloadClick,
  onSaveClick,
  onLoadClick,
  onSettingsClick,
}: AppBarProps) {
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState<null | HTMLElement>(null);

  const handleDownloadMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setDownloadMenuAnchor(event.currentTarget);
  };

  const handleDownloadMenuClose = () => {
    setDownloadMenuAnchor(null);
  };

  const handleDownloadClick = (format: 'png' | 'json' | 'afb' | 'flowviz') => {
    onDownloadClick(format);
    handleDownloadMenuClose();
  };

  return (
    <MuiAppBar 
      position="static" 
      elevation={0}
      sx={{ 
        backgroundColor: '#0d1117',
        backdropFilter: 'blur(20px)',
        background: `
          linear-gradient(180deg, #0d1117 0%, rgba(13, 17, 23, 0.8) 100%),
          linear-gradient(90deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%)
        `,
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <Toolbar sx={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: '64px' }}>
        {/* Left Side - Brand */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          flex: '1 1 0',
          justifyContent: 'flex-start'
        }}>
          <Typography
            variant="h6"
            sx={{
              background: isStreaming 
                ? 'linear-gradient(90deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 1) 25%, rgba(255, 255, 255, 1) 50%, rgba(255, 255, 255, 1) 75%, rgba(255, 255, 255, 0.3) 100%)'
                : 'linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.7) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              ...(isStreaming && {
                backgroundSize: '200% 100%',
                animation: `${streamingGradient} 2s ease-in-out infinite`,
              }),
            }}
          >
            FlowViz
          </Typography>
        </Box>

        {/* Center - Story Mode Controls */}
        <Box sx={{ 
          flex: '1 1 0', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
        }}>
          {storyModeData && (
            <ToolbarStoryModeControls
              storyState={storyModeData.storyState}
              controls={storyModeData.controls}
              currentStepData={storyModeData.currentStepData}
              onResetView={storyModeData.onResetView}
            />
          )}
        </Box>


        {/* Right Side - Action Buttons */}
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          alignItems: 'center',
          flex: '1 1 0',
          justifyContent: 'flex-end'
        }}>
          {showGraphActions && (
            <Tooltip title="Analyze a report" placement="bottom">
              <GlassIconButton 
                onClick={onNewSearch}
                size="small"
              >
                <FlowIcon size="small">
                  <SearchIcon />
                </FlowIcon>
              </GlassIconButton>
            </Tooltip>
          )}

          {exportFunction && (
            <Tooltip title="Export options" placement="bottom">
              <GlassIconButton 
                onClick={handleDownloadMenuOpen}
                size="small"
              >
                <FlowIcon size="small">
                  <DownloadIcon />
                </FlowIcon>
              </GlassIconButton>
            </Tooltip>
          )}

          {showGraphActions && (
            <Tooltip title="Save analysis" placement="bottom">
              <GlassIconButton 
                onClick={onSaveClick}
                size="small"
              >
                <FlowIcon size="small">
                  <SaveIcon />
                </FlowIcon>
              </GlassIconButton>
            </Tooltip>
          )}

          <Tooltip title="Load analysis" placement="bottom">
            <GlassIconButton 
              onClick={onLoadClick}
              size="small"
            >
              <FlowIcon size="small">
                <FolderOpenIcon />
              </FlowIcon>
            </GlassIconButton>
          </Tooltip>

          <Tooltip title="Settings" placement="bottom">
            <GlassIconButton 
              onClick={onSettingsClick}
              size="small"
            >
              <FlowIcon size="small">
                <SettingsIcon />
              </FlowIcon>
            </GlassIconButton>
          </Tooltip>
        </Box>

        {/* Download Menu */}
        <ActionMenu
          anchorEl={downloadMenuAnchor}
          open={Boolean(downloadMenuAnchor)}
          onClose={handleDownloadMenuClose}
          variant="dark"
          items={[
            {
              id: 'png',
              text: 'Export as PNG',
              icon: <ImageIcon fontSize="small" />,
              onClick: () => handleDownloadClick('png'),
            },
            {
              id: 'json',
              text: 'Export as STIX Bundle',
              icon: <CodeIcon fontSize="small" />,
              onClick: () => handleDownloadClick('json'),
            },
            {
              id: 'afb',
              text: 'Export as AFB',
              icon: <TextFieldsIcon fontSize="small" />,
              onClick: () => handleDownloadClick('afb'),
            },
            {
              id: 'flowviz',
              text: 'Export as FlowViz',
              icon: <AccountTreeIcon fontSize="small" />,
              onClick: () => handleDownloadClick('flowviz'),
            },
          ]}
        />
      </Toolbar>
    </MuiAppBar>
  );
}