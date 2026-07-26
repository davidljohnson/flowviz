import { useEffect, useRef, useState } from 'react';
import {
  Typography,
  Box,
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
  FormSectionTitle
} from '../../../shared/components/EnhancedForm';
import {
  DropdownFormControl,
  DropdownSelect,
  DropdownMenuItem,
  dropdownMenuStylesDark
} from '../../../shared/components/Dropdown';
import SegmentedControl from '../../../shared/components/SegmentedControl';
import { useProviderConfig } from '../hooks/useProviderConfig';
import { createScrollbarStyle, flowVizTheme, type ThemeMode } from '../../../shared/theme/flowviz-theme';
import { useThemeMode } from '../../../shared/theme/ThemeModeProvider';

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
] as const satisfies readonly { value: ThemeMode; label: string }[];

/** Field label, matching the inspector's uppercase micro-label. */
const fieldLabelSx = {
  display: 'block',
  color: flowVizTheme.colors.text.tertiary,
  fontSize: '0.68rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  mb: 0.75,
};

interface SettingsDialogProps {
  open: boolean;
  edgeColor: string;
  edgeStyle: string;
  edgeCurve: string;
  selectedProvider: string;
  selectedModel: string;
  onClose: () => void;
  onEdgeColorChange: (color: string) => void;
  onEdgeStyleChange: (style: string) => void;
  onEdgeCurveChange: (curve: string) => void;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onSave: (settings: {
    edgeColor: string;
    edgeStyle: string;
    edgeCurve: string;
    selectedProvider: string;
    selectedModel: string;
  }) => void;
}

export default function SettingsDialog({
  open,
  edgeColor,
  edgeStyle,
  edgeCurve,
  selectedProvider,
  selectedModel,
  onClose,
  onEdgeColorChange,
  onEdgeStyleChange,
  onEdgeCurveChange,
  onProviderChange,
  onModelChange,
  onSave,
}: SettingsDialogProps) {
  // Get provider configuration
  const {
    providers,
    selectedProvider: defaultProvider,
    selectedModel: defaultModel,
    setSelectedProvider: setProviderConfigProvider,
  } = useProviderConfig();

  // The theme is the one setting applied live rather than on save: picking it
  // blind and then hunting for the Save button is a worse way to choose a
  // theme than just seeing it. Cancel puts back whatever was in effect when
  // the dialog opened.
  const { mode, setMode } = useThemeMode();
  const modeOnOpenRef = useRef<ThemeMode>(mode);
  useEffect(() => {
    if (open) modeOnOpenRef.current = mode;
    // Only when the dialog opens — `mode` changing while it's open is the
    // user previewing, which must not move the restore point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Local state for dialog - only apply on save
  const [localEdgeColor, setLocalEdgeColor] = useState(edgeColor);
  const [localEdgeStyle, setLocalEdgeStyle] = useState(edgeStyle);
  const [localEdgeCurve, setLocalEdgeCurve] = useState(edgeCurve);
  const [localSelectedProvider, setLocalSelectedProvider] = useState(selectedProvider);
  const [localSelectedModel, setLocalSelectedModel] = useState(selectedModel);

  // Update local state when props change (when dialog opens)
  useEffect(() => {
    setLocalEdgeColor(edgeColor);
    setLocalEdgeStyle(edgeStyle);
    setLocalEdgeCurve(edgeCurve);

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
  }, [edgeColor, edgeStyle, edgeCurve, selectedProvider, selectedModel, defaultProvider, defaultModel, providers, open]);

  const handleSave = () => {
    // Apply all settings at once by passing the local values directly
    onEdgeColorChange(localEdgeColor);
    onEdgeStyleChange(localEdgeStyle);
    onEdgeCurveChange(localEdgeCurve);
    onProviderChange(localSelectedProvider);
    onModelChange(localSelectedModel);

    // Pass the values to save immediately
    onSave({
      edgeColor: localEdgeColor,
      edgeStyle: localEdgeStyle,
      edgeCurve: localEdgeCurve,
      selectedProvider: localSelectedProvider,
      selectedModel: localSelectedModel,
    });
  };

  const handleCancel = () => {
    setMode(modeOnOpenRef.current);
    // Reset local state to current values
    setLocalEdgeColor(edgeColor);
    setLocalEdgeStyle(edgeStyle);
    setLocalEdgeCurve(edgeCurve);
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
      <EnhancedDialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>

          <FormSection>
            <FormSectionTitle>
              Appearance
            </FormSectionTitle>

            <Box>
              <Typography component="label" sx={fieldLabelSx}>Theme</Typography>
              <SegmentedControl
                fullWidth
                aria-label="Colour theme"
                options={THEME_OPTIONS}
                value={mode}
                onChange={setMode}
              />
            </Box>
          </FormSection>

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
                      color: 'rgba(var(--fv-overlay-rgb), 0.45)',
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
                          color: 'rgba(var(--fv-overlay-rgb), 0.9)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1.5,
                          '&:hover': {
                            backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.05)',
                          },
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.08)',
                            '&:hover': {
                              backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.1)',
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
                              backgroundColor: 'rgba(var(--fv-overlay-rgb), 0.08)',
                              color: 'rgba(var(--fv-overlay-rgb), 0.7)',
                              border: '1px solid rgba(var(--fv-overlay-rgb), 0.2)',
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
              Edge Styling
            </FormSectionTitle>
            
            {/* The edge inspector offers these same three choices per edge, as
                segmented controls with the label above. Matching it means the
                defaults here look like the thing they set. */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box>
                <Typography component="label" sx={fieldLabelSx}>Color</Typography>
                <SegmentedControl
                  fullWidth
                  aria-label="Default edge color"
                  options={[
                    { value: 'default', label: 'Default' },
                    // Stored as 'white' since that's what it has always been
                    // written as; on a light canvas it renders as graphite.
                    { value: 'white', label: 'Mono' },
                    { value: 'blue', label: 'Blue' },
                  ]}
                  value={localEdgeColor}
                  onChange={setLocalEdgeColor}
                />
              </Box>

              <Box>
                <Typography component="label" sx={fieldLabelSx}>Style</Typography>
                <SegmentedControl
                  fullWidth
                  aria-label="Default edge style"
                  options={[
                    { value: 'solid', label: 'Solid' },
                    { value: 'dashed', label: 'Dashed' },
                  ]}
                  value={localEdgeStyle}
                  onChange={setLocalEdgeStyle}
                />
              </Box>

              <Box>
                <Typography component="label" sx={fieldLabelSx}>Shape</Typography>
                <SegmentedControl
                  fullWidth
                  aria-label="Default edge shape"
                  options={[
                    { value: 'smooth', label: 'Curved' },
                    { value: 'straight', label: 'Straight' },
                    { value: 'step', label: 'Stepped' },
                  ]}
                  value={localEdgeCurve}
                  onChange={setLocalEdgeCurve}
                />
              </Box>
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