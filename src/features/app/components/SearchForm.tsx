import { useRef, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
  AlertTitle,
  Chip,
  CircularProgress,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import SearchIcon from '@mui/icons-material/Search';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { keyframes } from '@mui/system';
import { SearchInputURL, SearchInputMultiline } from '../../../shared/components/SearchInput';
import { HeroSubmitButton } from '../../../shared/components/Button';
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

const INPUT_MODES = [
  { value: 'url', label: 'URL', icon: LinkIcon },
  { value: 'text', label: 'Text', icon: TextFieldsIcon },
  { value: 'pdf', label: 'PDF', icon: PictureAsPdfIcon },
] as const;

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
  // Check if any providers are configured
  const { hasConfiguredProviders, isLoading: providersLoading } = useProviderConfig();

  // PDF ingestion (client-side): extract text in the browser, then feed it
  // through the existing text path via onTextChange.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfStatus, setPdfStatus] = useState<
    'idle' | 'processing' | 'vision' | 'done' | 'error'
  >('idle');
  const [pdfProgress, setPdfProgress] = useState<{ page: number; total: number } | null>(null);
  const [pdfError, setPdfError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handlePdfFile = async (file: File) => {
    setPdfFileName(file.name);
    setPdfStatus('processing');
    setPdfProgress(null);
    setPdfError('');
    onTextChange('');

    try {
      // Dynamic import keeps pdf.js out of the initial bundle.
      const { extractPdfText, renderPdfImagePages } = await import(
        '../../../shared/services/pdf/pdfExtractor'
      );
      const result = await extractPdfText(file, (p) =>
        setPdfProgress({ page: p.page, total: p.totalPages })
      );

      let finalText = result.text;

      // Phase 2: analyze diagrams/screenshots. Only pages with raster images
      // are rendered, so a text-only report makes no vision call. Best-effort —
      // if it fails (e.g. Anthropic key not set), fall back to text only.
      try {
        const images = await renderPdfImagePages(file, 3);
        if (images.length > 0) {
          setPdfStatus('vision');
          const resp = await fetch('/api/vision-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images, articleText: result.text }),
          });
          if (resp.ok) {
            const { analysisText } = await resp.json();
            if (analysisText) {
              finalText = `## Diagram Analysis\n\n${analysisText}\n\n## Report Text\n\n${result.text}`;
            }
          }
        }
      } catch {
        // Keep the text-only extraction on any vision failure.
      }

      onTextChange(finalText);
      setPdfStatus('done');
    } catch (err) {
      onTextChange('');
      setPdfStatus('error');
      setPdfError(err instanceof Error ? err.message : 'Could not read this PDF.');
    }
  };

  const pdfTextStats = getTextStats(textContent);
  const pdfBusy = pdfStatus === 'processing' || pdfStatus === 'vision';

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

      {/* Show warning when no providers are configured */}
      {!providersLoading && !hasConfiguredProviders && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 4 },
            mb: 3,
            backgroundColor: flowVizTheme.colors.status.warning.bg,
            backdropFilter: flowVizTheme.effects.blur.heavy,
            border: `1px solid ${flowVizTheme.colors.status.warning.border}`,
            borderRadius: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <WarningAmberIcon sx={{
              color: flowVizTheme.colors.status.warning.accent,
              fontSize: '2rem',
              mt: 0.5
            }} />
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="h6"
                sx={{
                  color: flowVizTheme.colors.status.warning.text,
                  fontWeight: 600,
                  mb: 1,
                  fontSize: '1.1rem'
                }}
              >
                No AI Provider Configured
              </Typography>
              <Typography
                sx={{
                  color: flowVizTheme.colors.status.warning.text,
                  fontSize: '0.95rem',
                  mb: 2,
                  lineHeight: 1.6,
                  opacity: 0.95
                }}
              >
                FlowViz requires an AI provider API key to analyze threat intelligence reports.
                Please configure at least one provider to continue.
              </Typography>

              <Box
                component="ol"
                sx={{
                  m: 0,
                  pl: 2.5,
                  color: flowVizTheme.colors.status.warning.text,
                  '& li': {
                    mb: 1,
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                    opacity: 0.9
                  }
                }}
              >
                <li>Add your API key to the <code style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem'
                }}>.env</code> file:</li>
                <Box
                  component="ul"
                  sx={{
                    mt: 1,
                    mb: 1.5,
                    pl: 3,
                    listStyle: 'disc',
                    '& li': { fontSize: '0.85rem', mb: 0.5 }
                  }}
                >
                  <li>For Claude: <code style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem'
                  }}>ANTHROPIC_API_KEY=your-key-here</code></li>
                  <li>For GPT: <code style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem'
                  }}>OPENAI_API_KEY=your-key-here</code></li>
                </Box>
                <li>Restart the server: <code style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem'
                }}>npm run dev:full</code></li>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

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
        {/* Input mode — compact monochrome segmented control */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
          <Box
            role="tablist"
            sx={{
              display: 'inline-flex',
              gap: '2px',
              p: '3px',
              backgroundColor: flowVizTheme.colors.surface.rest,
              borderRadius: `${flowVizTheme.borderRadius.lg}px`,
              border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
            }}
          >
            {INPUT_MODES.map(({ value, label, icon: Icon }) => {
              const active = inputMode === value;
              return (
                <Box
                  key={value}
                  role="tab"
                  aria-selected={active}
                  onClick={() => onInputModeChange(value)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.75,
                    py: 0.75,
                    borderRadius: `${flowVizTheme.borderRadius.md}px`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: active
                      ? flowVizTheme.colors.text.primary
                      : flowVizTheme.colors.text.tertiary,
                    backgroundColor: active ? flowVizTheme.colors.surface.hover : 'transparent',
                    transition: `color ${flowVizTheme.motion.fast}, background-color ${flowVizTheme.motion.fast}`,
                    '&:hover': {
                      color: active
                        ? flowVizTheme.colors.text.primary
                        : flowVizTheme.colors.text.secondary,
                      backgroundColor: active
                        ? flowVizTheme.colors.surface.hover
                        : flowVizTheme.colors.surface.rest,
                    },
                  }}
                >
                  <Icon sx={{ fontSize: 16 }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.01em' }}>
                    {label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box component="form" onSubmit={onSubmit}>
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
          ) : inputMode === 'pdf' ? (
            <Box sx={{ mb: 3 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePdfFile(file);
                  e.target.value = '';
                }}
              />
              <Box
                onClick={() => !pdfBusy && fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!pdfBusy) setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (pdfBusy) return;
                  const file = e.dataTransfer.files?.[0];
                  if (file) handlePdfFile(file);
                }}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: 1.25,
                  px: 3,
                  py: 6,
                  minHeight: 240,
                  borderRadius: 3,
                  cursor: pdfBusy ? 'default' : 'pointer',
                  border: `1.5px dashed ${
                    pdfStatus === 'error'
                      ? flowVizTheme.colors.surface.border.emphasis
                      : isDragging
                        ? flowVizTheme.colors.surface.border.focus
                        : flowVizTheme.colors.surface.border.subtle
                  }`,
                  background: isDragging
                    ? flowVizTheme.colors.surface.hover
                    : flowVizTheme.colors.surface.rest,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor:
                      pdfBusy
                        ? undefined
                        : flowVizTheme.colors.surface.border.default,
                    background:
                      pdfBusy
                        ? undefined
                        : flowVizTheme.colors.surface.hover,
                  },
                }}
              >
                {pdfBusy ? (
                  <>
                    <CircularProgress size={28} thickness={4} sx={{ color: flowVizTheme.colors.text.tertiary }} />
                    <Typography sx={{ color: flowVizTheme.colors.text.primary, fontWeight: 500 }}>
                      {pdfStatus === 'vision'
                        ? 'Analyzing diagrams…'
                        : `Extracting text${pdfFileName ? ` from ${pdfFileName}` : ''}…`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: flowVizTheme.colors.text.tertiary }}>
                      {pdfStatus === 'vision'
                        ? 'Reading images with vision analysis'
                        : pdfProgress
                          ? `Page ${pdfProgress.page} of ${pdfProgress.total}`
                          : 'Reading document…'}
                    </Typography>
                  </>
                ) : pdfStatus === 'done' ? (
                  <>
                    <PictureAsPdfIcon
                      sx={{ fontSize: 36, color: flowVizTheme.colors.text.secondary }}
                    />
                    <Typography sx={{ color: flowVizTheme.colors.text.primary, fontWeight: 500 }}>
                      {pdfFileName}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: pdfTextStats.isOverLimit
                          ? flowVizTheme.colors.text.secondary
                          : flowVizTheme.colors.text.tertiary,
                      }}
                    >
                      {pdfTextStats.isOverLimit
                        ? `Too long — reduce to under ${TEXT_LIMITS.MAX_CHARS.toLocaleString()} characters`
                        : `${pdfTextStats.chars.toLocaleString()} characters extracted · click to replace`}
                    </Typography>
                  </>
                ) : pdfStatus === 'error' ? (
                  <>
                    <WarningAmberIcon
                      sx={{ fontSize: 36, color: flowVizTheme.colors.text.secondary }}
                    />
                    <Typography sx={{ color: flowVizTheme.colors.text.primary, fontWeight: 500 }}>
                      {pdfError}
                    </Typography>
                    <Typography variant="caption" sx={{ color: flowVizTheme.colors.text.tertiary }}>
                      Click to try another file
                    </Typography>
                  </>
                ) : (
                  <>
                    <UploadFileIcon
                      sx={{ fontSize: 36, color: flowVizTheme.colors.text.tertiary }}
                    />
                    <Typography sx={{ color: flowVizTheme.colors.text.secondary, fontWeight: 500 }}>
                      Drop a PDF report here, or click to browse
                    </Typography>
                    <Typography variant="caption" sx={{ color: flowVizTheme.colors.text.tertiary }}>
                      Up to 20&nbsp;MB · 100 pages · text-based PDFs
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
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
              disabled={
                !hasConfiguredProviders ||
                isLoading ||
                pdfBusy ||
                (inputMode === 'pdf' && pdfStatus !== 'done') ||
                ((inputMode === 'text' || inputMode === 'pdf') && pdfTextStats.isOverLimit)
              }
              isLoading={isLoading}
            >
              <SearchIcon sx={{ fontSize: 20, color: flowVizTheme.colors.text.primary }} />
              <span>
                {inputMode === 'url'
                  ? 'Analyze Article'
                  : inputMode === 'pdf'
                    ? 'Analyze PDF'
                    : 'Analyze Text'}
              </span>
            </HeroSubmitButton>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}