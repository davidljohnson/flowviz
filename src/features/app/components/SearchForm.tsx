import { Box, Container, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import { flowVizTheme } from '../../../shared/theme/flowviz-theme';
import AnalysisInput from './AnalysisInput';

const streamingGradient = keyframes`
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
`;

interface SearchFormProps {
  isLoading: boolean;
  isStreaming: boolean;
  inputMode: 'url' | 'text' | 'pdf';
  url: string;
  textContent: string;
  urlError: boolean;
  urlHelperText: string;
  onInputModeChange: (mode: 'url' | 'text' | 'pdf') => void;
  onUrlChange: (url: string) => void;
  onTextChange: (text: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  /** Opens the editor with an empty canvas - no AI analysis or provider needed. */
  onBlankFlow?: () => void;
}

/**
 * The landing page: hero, the analysis form, and the blank-canvas escape hatch.
 * The form itself lives in AnalysisInput, which the on-canvas Analyse dialog
 * also renders — so this component owns only what is specific to the landing
 * page (the wide container, the FlowViz hero, the blank-canvas link).
 */
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
  onBlankFlow,
}: SearchFormProps) {
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

      <AnalysisInput
        isLoading={isLoading}
        inputMode={inputMode}
        url={url}
        textContent={textContent}
        urlError={urlError}
        urlHelperText={urlHelperText}
        onInputModeChange={onInputModeChange}
        onUrlChange={onUrlChange}
        onTextChange={onTextChange}
        onSubmit={onSubmit}
      />

      {/* Blank-canvas entry point - works without any configured provider */}
      {onBlankFlow && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Typography
            component="button"
            type="button"
            onClick={onBlankFlow}
            sx={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              color: flowVizTheme.colors.text.tertiary,
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              textDecorationColor: flowVizTheme.colors.surface.border.emphasis,
              transition: flowVizTheme.motion.normal,
              '&:hover': {
                color: flowVizTheme.colors.text.primary,
              },
            }}
          >
            or start with a blank canvas
          </Typography>
        </Box>
      )}
    </Container>
  );
}
