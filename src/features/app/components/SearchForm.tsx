import {
  Box,
  Container,
  Typography,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import SearchIcon from '@mui/icons-material/Search';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { keyframes } from '@mui/system';
import { SearchInputURL, SearchInputMultiline } from '../../../shared/components/SearchInput';
import { HeroSubmitButton } from '../../../shared/components/Button';
import { CaptionText } from '../../../shared/components/Typography';
import { flowVizTheme } from '../../../shared/theme/flowviz-theme';
import { useProviderConfig } from '../hooks/useProviderConfig';

const streamingGradient = keyframes`
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
`;

const TEXT_LIMITS = {
  MAX_CHARS: 650000,
  WARNING_CHARS: 500000,
  MAX_WORDS: Math.floor(650000 / 5),
} as const;

const getTextStats = (text: string) => {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isNearLimit = chars > TEXT_LIMITS.WARNING_CHARS;
  const isOverLimit = chars > TEXT_LIMITS.MAX_CHARS;
  return { chars, words, isNearLimit, isOverLimit };
};

interface SearchFormProps {
  isLoading: boolean;
  isStreaming: boolean;
  inputMode: 'url' | 'text';
  url: string;
  textContent: string;
  urlError: boolean;
  urlHelperText: string;
  onInputModeChange: (mode: 'url' | 'text') => void;
  onUrlChange: (url: string) => void;
  onTextChange: (text: string) => void;
  onSubmit: (e: React.FormEvent, options?: { provider?: string; model?: string }) => void;
}

export default function SearchForm({
  isLoading,
  isStreaming,
  inputMode,
  url,
  textContent,
  urlError,
  urlHelperText,
  onInputModeChange,
  onUrlChange,
  onTextChange,
  onSubmit,
}: SearchFormProps) {
  // Provider configuration hook
  const {
    providers,
    hasConfiguredProviders,
    selectedProvider,
    selectedModel,
    availableModels,
    setSelectedProvider,
    setSelectedModel,
    currentProviderName,
  } = useProviderConfig();

  // Handle form submission with provider options
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e, {
      provider: selectedProvider,
      model: selectedModel,
    });
  };
  return (
    <Container 
      maxWidth="md" 
      sx={{ 
        mt: { xs: 4, md: 8 },
        mb: 4,
        px: { xs: 2, sm: 3 },
        position: 'relative',
        zIndex: 1,
      }}
    >
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography
          variant="h2"
          sx={{
            color: '#fff',
            fontWeight: 700,
            mb: 2,
            fontSize: { xs: '2.5rem', md: '3.5rem' },
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            background: isStreaming 
              ? 'linear-gradient(90deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 1) 25%, rgba(255, 255, 255, 1) 50%, rgba(255, 255, 255, 1) 75%, rgba(255, 255, 255, 0.4) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.85) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 80px rgba(255, 255, 255, 0.1)',
            ...(isStreaming && {
              backgroundSize: '200% 100%',
              animation: `${streamingGradient} 2s ease-in-out infinite`,
            }),
          }}
        >
          FlowViz
        </Typography>
        
        <Typography
          variant="h6"
          sx={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontWeight: 400,
            maxWidth: '600px',
            mx: 'auto',
            lineHeight: 1.6,
            letterSpacing: '0.01em',
          }}
        >
          Real-time visualization of attack patterns from threat intelligence reports
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          backgroundColor: flowVizTheme.colors.background.glass,
          backdropFilter: flowVizTheme.effects.blur.heavy,
          border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${flowVizTheme.colors.surface.border.default}, transparent)`,
          },
        }}
      >
        {/* Input Mode Tabs */}
        <Box sx={{ 
          mb: 4,
          display: 'flex',
          justifyContent: 'center'
        }}>
          <Box sx={{
            display: 'inline-flex',
            gap: '2px',
            p: '3px',
            background: `linear-gradient(145deg, ${flowVizTheme.colors.surface.rest} 0%, ${flowVizTheme.colors.surface.rest} 100%)`,
            borderRadius: '16px',
            border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
            backdropFilter: flowVizTheme.effects.blur.heavy,
            boxShadow: flowVizTheme.effects.shadows.sm,
          }}>
            <Box
              onClick={() => onInputModeChange('url')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 3.5,
                py: 1.5,
                borderRadius: '13px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                background: inputMode === 'url' 
                  ? `linear-gradient(135deg, ${flowVizTheme.colors.surface.active} 0%, ${flowVizTheme.colors.surface.hover} 100%)`
                  : 'transparent',
                backdropFilter: inputMode === 'url' ? flowVizTheme.effects.blur.light : 'none',
                boxShadow: inputMode === 'url'
                  ? flowVizTheme.effects.shadows.sm
                  : 'none',
                border: inputMode === 'url'
                  ? `1px solid ${flowVizTheme.colors.surface.border.subtle}`
                  : '1px solid transparent',
                color: inputMode === 'url'
                  ? flowVizTheme.colors.text.primary
                  : flowVizTheme.colors.text.tertiary,
                '&:hover': {
                  background: inputMode === 'url'
                    ? `linear-gradient(135deg, ${flowVizTheme.colors.surface.active} 0%, ${flowVizTheme.colors.surface.hover} 100%)`
                    : flowVizTheme.colors.surface.rest,
                  color: inputMode === 'url'
                    ? flowVizTheme.colors.text.primary
                    : flowVizTheme.colors.text.secondary,
                },
              }}
            >
              <LinkIcon sx={{ 
                fontSize: '18px',
                opacity: inputMode === 'url' ? 0.9 : 0.6,
                transition: 'all 0.3s ease',
              }} />
              <Typography sx={{ 
                fontSize: '15px',
                fontWeight: 500,
                letterSpacing: '0.01em',
                transition: 'opacity 0.3s ease, color 0.3s ease',
              }}>
                Article URL
              </Typography>
            </Box>
            
            <Box
              onClick={() => onInputModeChange('text')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 3.5,
                py: 1.5,
                borderRadius: '13px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                background: inputMode === 'text' 
                  ? `linear-gradient(135deg, ${flowVizTheme.colors.surface.active} 0%, ${flowVizTheme.colors.surface.hover} 100%)`
                  : 'transparent',
                backdropFilter: inputMode === 'text' ? flowVizTheme.effects.blur.light : 'none',
                boxShadow: inputMode === 'text'
                  ? flowVizTheme.effects.shadows.sm
                  : 'none',
                border: inputMode === 'text'
                  ? `1px solid ${flowVizTheme.colors.surface.border.subtle}`
                  : '1px solid transparent',
                color: inputMode === 'text'
                  ? flowVizTheme.colors.text.primary
                  : flowVizTheme.colors.text.tertiary,
                '&:hover': {
                  background: inputMode === 'text'
                    ? `linear-gradient(135deg, ${flowVizTheme.colors.surface.active} 0%, ${flowVizTheme.colors.surface.hover} 100%)`
                    : flowVizTheme.colors.surface.rest,
                  color: inputMode === 'text'
                    ? flowVizTheme.colors.text.primary
                    : flowVizTheme.colors.text.secondary,
                },
              }}
            >
              <TextFieldsIcon sx={{ 
                fontSize: '18px',
                opacity: inputMode === 'text' ? 0.9 : 0.6,
                transition: 'all 0.3s ease',
              }} />
              <Typography sx={{ 
                fontSize: '15px',
                fontWeight: 500,
                letterSpacing: '0.01em',
                transition: 'opacity 0.3s ease, color 0.3s ease',
              }}>
                Paste Text
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* AI Provider and Model Selection */}
        {hasConfiguredProviders && providers.length > 0 && (
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {/* Provider Selector - only show if multiple providers */}
            {providers.length > 1 && (
              <FormControl
                size="small"
                sx={{
                  flex: '1 1 200px',
                  minWidth: '200px',
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: flowVizTheme.colors.surface.rest,
                    backdropFilter: flowVizTheme.effects.blur.light,
                    borderRadius: '12px',
                    border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
                    '&:hover': {
                      borderColor: flowVizTheme.colors.surface.border.default,
                    },
                    '&.Mui-focused': {
                      borderColor: flowVizTheme.colors.surface.border.default,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: flowVizTheme.colors.text.tertiary,
                    '&.Mui-focused': {
                      color: flowVizTheme.colors.text.secondary,
                    },
                  },
                  '& .MuiSelect-select': {
                    color: flowVizTheme.colors.text.primary,
                    paddingRight: '24px !important', // Reduce gap between text and dropdown icon
                  },
                  '& .MuiSelect-icon': {
                    right: '4px', // Move dropdown icon closer to the text
                  },
                }}
              >
                <InputLabel>AI Provider</InputLabel>
                <Select
                  value={selectedProvider || ''}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  label="AI Provider"
                  startAdornment={
                    <PsychologyIcon sx={{
                      fontSize: 18,
                      ml: 0.5,
                      mr: 1, // Increased spacing between icon and text
                      color: flowVizTheme.colors.text.tertiary
                    }} />
                  }
                >
                  {providers.map((provider) => (
                    <MenuItem key={provider.id} value={provider.id}>
                      {provider.displayName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Model Selector */}
            <FormControl
              size="small"
              sx={{
                flex: '1 1 250px',
                minWidth: '250px',
                '& .MuiOutlinedInput-root': {
                  backgroundColor: flowVizTheme.colors.surface.rest,
                  backdropFilter: flowVizTheme.effects.blur.light,
                  borderRadius: '12px',
                  border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
                  '&:hover': {
                    borderColor: flowVizTheme.colors.surface.border.default,
                  },
                  '&.Mui-focused': {
                    borderColor: flowVizTheme.colors.surface.border.default,
                  },
                },
                '& .MuiInputLabel-root': {
                  color: flowVizTheme.colors.text.tertiary,
                  '&.Mui-focused': {
                    color: flowVizTheme.colors.text.secondary,
                  },
                },
                '& .MuiSelect-select': {
                  color: flowVizTheme.colors.text.primary,
                  paddingRight: '24px !important', // Reduce gap between text and dropdown icon
                },
                '& .MuiSelect-icon': {
                  right: '4px', // Move dropdown icon closer to the text
                },
              }}
            >
              <InputLabel>Model</InputLabel>
              <Select
                value={selectedModel || ''}
                onChange={(e) => setSelectedModel(e.target.value)}
                label="Model"
              >
                {availableModels.map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Provider indicator chip */}
            {providers.length === 1 && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip
                  icon={<PsychologyIcon />}
                  label={`Using ${currentProviderName}`}
                  size="small"
                  sx={{
                    backgroundColor: flowVizTheme.colors.surface.rest,
                    border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
                    color: flowVizTheme.colors.text.secondary,
                    '& .MuiChip-icon': {
                      color: flowVizTheme.colors.text.tertiary,
                    },
                  }}
                />
              </Box>
            )}
          </Box>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          {inputMode === 'url' ? (
            <SearchInputURL
              fullWidth
              placeholder="Enter article URL"
              variant="outlined"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              error={urlError}
              helperText={urlHelperText}
              sx={{ mb: 3 }}
            />
          ) : (
            <Box sx={{ mb: 3 }}>
              <SearchInputMultiline
                fullWidth
                multiline
                rows={12}
                placeholder="Paste your article or report here"
                variant="outlined"
                value={textContent}
                onChange={(e) => onTextChange(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: getTextStats(textContent).isOverLimit 
                      ? flowVizTheme.colors.status.error.border
                      : getTextStats(textContent).isNearLimit 
                        ? flowVizTheme.colors.status.warning.border
                        : flowVizTheme.colors.surface.border.default,
                  },
                }}
              />
              
              {/* Text Statistics */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mt: 1,
                px: 1
              }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ 
                    color: getTextStats(textContent).isOverLimit 
                      ? flowVizTheme.colors.status.error.text
                      : getTextStats(textContent).isNearLimit 
                        ? flowVizTheme.colors.status.warning.text
                        : flowVizTheme.colors.text.tertiary
                  }}>
                    {getTextStats(textContent).chars.toLocaleString()} / {TEXT_LIMITS.MAX_CHARS.toLocaleString()} characters
                  </Typography>
                  <Typography variant="caption" sx={{ color: flowVizTheme.colors.text.tertiary }}>
                    ~{getTextStats(textContent).words.toLocaleString()} words
                  </Typography>
                </Box>
                
                {getTextStats(textContent).isNearLimit && (
                  <Chip
                    size="small"
                    label={getTextStats(textContent).isOverLimit ? "Too Long" : "Near Limit"}
                    color={getTextStats(textContent).isOverLimit ? "error" : "warning"}
                    sx={{
                      fontSize: '0.7rem',
                      height: '20px',
                      '& .MuiChip-label': {
                        px: 1
                      }
                    }}
                  />
                )}
              </Box>
            </Box>
          )}
          
          <Box
            sx={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            {/* First blur layer */}
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                height: 'calc(100% + 2px)',
                width: 'calc(100% + 2px)',
                transform: 'translate(-50%, -50%)',
                borderRadius: '100px',
                willChange: 'transform',
                opacity: 0.4,
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  height: '100%',
                  width: '100%',
                  borderRadius: '100px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(2px)',
                }}
              />
            </Box>

            {/* Second blur layer */}
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                height: 'calc(100% + 2px)',
                width: 'calc(100% + 2px)',
                transform: 'translate(-50%, -50%) scaleX(-1)',
                borderRadius: '100px',
                willChange: 'transform',
                opacity: 0.2,
              }}
            >
              <Box
                sx={{
                  position: 'relative',
                  height: '100%',
                  width: '100%',
                  borderRadius: '100px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                }}
              />
            </Box>

            <HeroSubmitButton
              variant="contained"
              type="submit"
              disabled={isLoading || (inputMode === 'text' && getTextStats(textContent).isOverLimit)}
              isLoading={isLoading}
            >
              <SearchIcon sx={{ fontSize: 20, color: flowVizTheme.colors.text.primary }} />
              <span>{inputMode === 'url' ? 'Analyze Article' : 'Analyze Text'}</span>
            </HeroSubmitButton>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}