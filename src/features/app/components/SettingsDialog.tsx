import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  FormControlLabel,
  Switch,
  MenuItem,
  InputLabel,
  ListSubheader,
  Chip,
} from '@mui/material';
import {
  EnhancedDialog,
  EnhancedDialogContent,
  EnhancedDialogActions,
  PrimaryButton,
  SecondaryButton
} from '../../../shared/components/EnhancedDialog';
import {
  FormSection,
  FormSectionTitle,
  EnhancedSlider
} from '../../../shared/components/EnhancedForm';
import {
  DropdownFormControl,
  DropdownSelect,
  DropdownMenuItem,
  dropdownMenuStylesDark
} from '../../../shared/components/Dropdown';
import { useProviderConfig } from '../hooks/useProviderConfig';
import { createScrollbarStyle, flowVizTheme } from '../../../shared/theme/flowviz-theme';

interface SettingsDialogProps {
  open: boolean;
  cinematicMode: boolean;
  edgeColor: string;
  edgeStyle: string;
  edgeCurve: string;
  storyModeSpeed: number;
  selectedProvider: string;
  selectedModel: string;
  onClose: () => void;
  onCinematicModeChange: (enabled: boolean) => void;
  onEdgeColorChange: (color: string) => void;
  onEdgeStyleChange: (style: string) => void;
  onEdgeCurveChange: (curve: string) => void;
  onStoryModeSpeedChange: (speed: number) => void;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onSave: (settings: {
    cinematicMode: boolean;
    edgeColor: string;
    edgeStyle: string;
    edgeCurve: string;
    storyModeSpeed: number;
    selectedProvider: string;
    selectedModel: string;
  }) => void;
}

export default function SettingsDialog({
  open,
  cinematicMode,
  edgeColor,
  edgeStyle,
  edgeCurve,
  storyModeSpeed,
  selectedProvider,
  selectedModel,
  onClose,
  onCinematicModeChange,
  onEdgeColorChange,
  onEdgeStyleChange,
  onEdgeCurveChange,
  onStoryModeSpeedChange,
  onProviderChange,
  onModelChange,
  onSave,
}: SettingsDialogProps) {
  // Get provider configuration
  const {
    providers,
    availableModels,
    selectedProvider: defaultProvider,
    selectedModel: defaultModel,
    setSelectedProvider: setProviderConfigProvider,
    setSelectedModel: setProviderConfigModel,
  } = useProviderConfig();

  // Local state for dialog - only apply on save
  const [localCinematicMode, setLocalCinematicMode] = useState(cinematicMode);
  const [localEdgeColor, setLocalEdgeColor] = useState(edgeColor);
  const [localEdgeStyle, setLocalEdgeStyle] = useState(edgeStyle);
  const [localEdgeCurve, setLocalEdgeCurve] = useState(edgeCurve);
  const [localStoryModeSpeed, setLocalStoryModeSpeed] = useState(storyModeSpeed);
  const [localSelectedProvider, setLocalSelectedProvider] = useState(selectedProvider);
  const [localSelectedModel, setLocalSelectedModel] = useState(selectedModel);

  // Update local state when props change (when dialog opens)
  useEffect(() => {
    setLocalCinematicMode(cinematicMode);
    setLocalEdgeColor(edgeColor);
    setLocalEdgeStyle(edgeStyle);
    setLocalEdgeCurve(edgeCurve);
    setLocalStoryModeSpeed(storyModeSpeed);

    // Determine provider and model to use
    const providerToUse = selectedProvider || defaultProvider || '';
    const modelToUse = selectedModel || defaultModel || '';

    // Check if the selected model exists in the available providers
    const modelExists = providers.some(p => p.models.includes(modelToUse));

    // If model doesn't exist or is empty, use first provider's default
    if ((!modelToUse || !modelExists) && providers.length > 0) {
      const firstProvider = providers[0];
      setLocalSelectedProvider(firstProvider.id);
      setLocalSelectedModel(firstProvider.defaultModel);
    } else {
      setLocalSelectedProvider(providerToUse);
      setLocalSelectedModel(modelToUse);
    }
  }, [cinematicMode, edgeColor, edgeStyle, edgeCurve, storyModeSpeed, selectedProvider, selectedModel, defaultProvider, defaultModel, providers, open]);

  const handleSave = () => {
    // Apply all settings at once by passing the local values directly
    onCinematicModeChange(localCinematicMode);
    onEdgeColorChange(localEdgeColor);
    onEdgeStyleChange(localEdgeStyle);
    onEdgeCurveChange(localEdgeCurve);
    onStoryModeSpeedChange(localStoryModeSpeed);
    onProviderChange(localSelectedProvider);
    onModelChange(localSelectedModel);

    // Pass the values to save immediately
    onSave({
      cinematicMode: localCinematicMode,
      edgeColor: localEdgeColor,
      edgeStyle: localEdgeStyle,
      edgeCurve: localEdgeCurve,
      storyModeSpeed: localStoryModeSpeed,
      selectedProvider: localSelectedProvider,
      selectedModel: localSelectedModel,
    });
  };

  const handleCancel = () => {
    // Reset local state to current values
    setLocalCinematicMode(cinematicMode);
    setLocalEdgeColor(edgeColor);
    setLocalEdgeStyle(edgeStyle);
    setLocalEdgeCurve(edgeCurve);
    setLocalStoryModeSpeed(storyModeSpeed);
    setLocalSelectedProvider(selectedProvider);
    setLocalSelectedModel(selectedModel);
    onClose();
  };
  return (
    <EnhancedDialog
      open={open}
      onClose={handleCancel}
      title="Settings"
      maxWidth="sm"
      fullWidth
      size="medium"
    >
      <EnhancedDialogContent sx={createScrollbarStyle('8px')}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>

          <FormSection>
            <FormSectionTitle>
              LLM Selection
            </FormSectionTitle>

            <DropdownFormControl size="small" fullWidth>
              <InputLabel>Model</InputLabel>
              <DropdownSelect
                value={
                  // Check if selected model exists in available providers
                  providers.some(p => p.models.includes(localSelectedModel))
                    ? localSelectedModel
                    : (providers.length > 0 ? providers[0].defaultModel : '')
                }
                onChange={(e) => {
                  const selectedModel = e.target.value as string;
                  setLocalSelectedModel(selectedModel);

                  // Find which provider this model belongs to
                  const provider = providers.find(p =>
                    p.models.includes(selectedModel)
                  );
                  if (provider) {
                    setLocalSelectedProvider(provider.id);
                    setProviderConfigProvider(provider.id);
                  }
                }}
                label="Model"
                MenuProps={{
                  ...dropdownMenuStylesDark,
                  PaperProps: {
                    ...dropdownMenuStylesDark.PaperProps,
                    sx: {
                      ...(dropdownMenuStylesDark.PaperProps?.sx as object),
                      maxHeight: '400px',
                      overflow: 'auto',
                      ...createScrollbarStyle('6px'),
                    } as any,
                  },
                  MenuListProps: {
                    ...dropdownMenuStylesDark.MenuListProps,
                    sx: {
                      ...(dropdownMenuStylesDark.MenuListProps?.sx as object),
                      py: 0.5,
                    },
                  },
                }}
              >
                {providers.map((provider, providerIndex) => [
                  <ListSubheader
                    key={`header-${provider.id}`}
                    sx={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      backgroundColor: flowVizTheme.colors.menu.appBar,
                      color: 'rgba(255, 255, 255, 0.45)',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      lineHeight: '32px',
                      py: 0.5,
                      px: 2,
                      mt: providerIndex > 0 ? 2 : 0.5,
                      mb: 0.5,
                      pointerEvents: 'none',
                    }}
                  >
                    {provider.displayName}
                  </ListSubheader>,
                  ...provider.models.map((model) => {
                    // Check if this is a reasoning/thinking model
                    const isThinkingModel = model.startsWith('o1') || model.startsWith('o3');

                    return (
                      <DropdownMenuItem
                        key={model}
                        value={model}
                        sx={{
                          px: 2,
                          py: 1,
                          fontSize: '0.875rem',
                          fontFamily: 'monospace',
                          color: 'rgba(255, 255, 255, 0.9)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1.5,
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          },
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            },
                          },
                        }}
                      >
                        <span>{model}</span>
                        {isThinkingModel && (
                          <Chip
                            label="Thinking"
                            size="small"
                            sx={{
                              height: '18px',
                              fontSize: '0.625rem',
                              fontWeight: 600,
                              letterSpacing: '0.03em',
                              backgroundColor: 'rgba(255, 255, 255, 0.08)',
                              color: 'rgba(255, 255, 255, 0.7)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              '& .MuiChip-label': {
                                px: 1,
                                py: 0,
                              },
                            }}
                          />
                        )}
                      </DropdownMenuItem>
                    );
                  })
                ])}
              </DropdownSelect>
            </DropdownFormControl>
          </FormSection>

          <FormSection>
            <FormSectionTitle>
              Story Mode
            </FormSectionTitle>
            
            <FormControlLabel
              control={
                <Switch
                  checked={localCinematicMode}
                  onChange={(e) => setLocalCinematicMode(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&.Mui-checked': {
                        color: 'rgba(255, 255, 255, 0.9)',
                      },
                      '&.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                      },
                    },
                    '& .MuiSwitch-track': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                />
              }
              label={
                <Box>
                  <Typography sx={{ 
                    color: 'rgba(255, 255, 255, 0.9)', 
                    fontSize: '0.9rem',
                    fontWeight: 500 
                  }}>
                    Cinematic Mode
                  </Typography>
                  <Typography sx={{ 
                    color: 'rgba(255, 255, 255, 0.6)', 
                    fontSize: '0.75rem',
                    mt: 0.5 
                  }}>
                    Fade top and bottom edges during story mode playback
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', ml: 0 }}
            />
            
            <Box sx={{ mt: 3 }}>
              <FormSectionTitle sx={{ 
                fontSize: '0.9rem',
                fontWeight: 500,
                mb: 1,
              }}>
                Playback Speed
              </FormSectionTitle>
              <Typography sx={{ 
                color: 'rgba(255, 255, 255, 0.6)', 
                fontSize: '0.75rem',
                mb: 2
              }}>
                Time between each step in story mode playback
              </Typography>
              <Box sx={{ px: 1 }}>
                <EnhancedSlider
                  value={localStoryModeSpeed || 3}
                  onChange={(_, newValue) => setLocalStoryModeSpeed(newValue as number)}
                  min={1}
                  max={10}
                  step={0.5}
                  marks={[
                    { value: 1, label: '1s' },
                    { value: 3, label: '3s' },
                    { value: 5, label: '5s' },
                    { value: 10, label: '10s' },
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `${value}s`}
                />
              </Box>
            </Box>
          </FormSection>
          
          <FormSection>
            <FormSectionTitle>
              Edge Styling
            </FormSectionTitle>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <DropdownFormControl size="small" fullWidth>
                <InputLabel>Color</InputLabel>
                <DropdownSelect
                  value={localEdgeColor}
                  onChange={(e) => setLocalEdgeColor(e.target.value as string)}
                  label="Color"
                  MenuProps={dropdownMenuStylesDark}
                >
                  <DropdownMenuItem value="default">Default (Blue)</DropdownMenuItem>
                  <DropdownMenuItem value="white">White</DropdownMenuItem>
                </DropdownSelect>
              </DropdownFormControl>
              
              <DropdownFormControl size="small" fullWidth>
                <InputLabel>Style</InputLabel>
                <DropdownSelect
                  value={localEdgeStyle}
                  onChange={(e) => setLocalEdgeStyle(e.target.value as string)}
                  label="Style"
                  MenuProps={dropdownMenuStylesDark}
                >
                  <DropdownMenuItem value="solid">Solid</DropdownMenuItem>
                  <DropdownMenuItem value="dashed">Dashed</DropdownMenuItem>
                </DropdownSelect>
              </DropdownFormControl>
              
              <DropdownFormControl size="small" fullWidth>
                <InputLabel>Curve</InputLabel>
                <DropdownSelect
                  value={localEdgeCurve}
                  onChange={(e) => setLocalEdgeCurve(e.target.value as string)}
                  label="Curve"
                  MenuProps={dropdownMenuStylesDark}
                >
                  <DropdownMenuItem value="smooth">Smooth (Curved)</DropdownMenuItem>
                  <DropdownMenuItem value="straight">Straight</DropdownMenuItem>
                  <DropdownMenuItem value="step">Step (Elbows)</DropdownMenuItem>
                </DropdownSelect>
              </DropdownFormControl>
            </Box>
          </FormSection>
          
        </Box>
      </EnhancedDialogContent>
      
      <EnhancedDialogActions>
        <SecondaryButton onClick={handleCancel}>
          Cancel
        </SecondaryButton>
        <PrimaryButton onClick={handleSave}>
          Save Settings
        </PrimaryButton>
      </EnhancedDialogActions>
    </EnhancedDialog>
  );
}