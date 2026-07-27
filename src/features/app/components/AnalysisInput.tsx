import { useRef, useState } from 'react';
import {
  Box,
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
import { SearchInputURL, SearchInputMultiline } from '../../../shared/components/SearchInput';
import SegmentedControl from '../../../shared/components/SegmentedControl';
import { HeroSubmitButton } from '../../../shared/components/Button';
import { flowVizTheme } from '../../../shared/theme/flowviz-theme';
import { TEXT_LIMITS, getTextStats } from '../../../shared/utils/textLimits';
import { useProviderConfig } from '../hooks/useProviderConfig';

const INPUT_MODES = [
  { value: 'url', label: 'URL', icon: LinkIcon },
  { value: 'text', label: 'Text', icon: TextFieldsIcon },
  { value: 'pdf', label: 'PDF', icon: PictureAsPdfIcon },
] as const;

export interface AnalysisInputProps {
  isLoading: boolean;
  inputMode: 'url' | 'text' | 'pdf';
  url: string;
  textContent: string;
  urlError: boolean;
  urlHelperText: string;
  onInputModeChange: (mode: 'url' | 'text' | 'pdf') => void;
  onUrlChange: (url: string) => void;
  onTextChange: (text: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  /**
   * Dialog placement: the host already provides a surface, so drop the panel
   * card and the decorative glow behind the submit button, shrink the PDF
   * dropzone, and state the missing-provider problem in one line instead of a
   * full setup guide.
   */
  compact?: boolean;
  /** Rendered between the input and the submit button (the merge/replace choice). */
  children?: React.ReactNode;
  /** Overrides the submit label, which otherwise names the input mode. */
  submitLabel?: string;
}

/**
 * The analysis form itself — mode switch, URL/text/PDF input, the client-side
 * PDF pipeline, and submit. Extracted from SearchForm so the same form can run
 * on the landing page and inside the on-canvas Analyse dialog; SearchForm keeps
 * only the landing-page furniture (hero, blank-canvas link).
 */
export default function AnalysisInput({
  isLoading,
  inputMode,
  url,
  textContent,
  urlError,
  urlHelperText,
  onInputModeChange,
  onUrlChange,
  onTextChange,
  onSubmit,
  compact = false,
  children,
  submitLabel,
}: AnalysisInputProps) {
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

  const submitDisabled =
    !hasConfiguredProviders ||
    isLoading ||
    pdfBusy ||
    (inputMode === 'pdf' && pdfStatus !== 'done') ||
    ((inputMode === 'text' || inputMode === 'pdf') && pdfTextStats.isOverLimit);

  // One stable label across all three inputs. URL, text and PDF are just ways
  // to hand over the same report, and the analysis they produce is identical —
  // the selected tab already says which input you are using, so the button
  // names the outcome instead of restating the tab and shifting under you.
  const defaultSubmitLabel = 'Analyze report';

  const providerWarning =
    providersLoading || hasConfiguredProviders ? null : compact ? (
      <Alert
        severity="warning"
        icon={<WarningAmberIcon fontSize="inherit" />}
        sx={{
          mb: 2.5,
          backgroundColor: flowVizTheme.colors.status.warning.bg,
          border: `1px solid ${flowVizTheme.colors.status.warning.border}`,
          color: flowVizTheme.colors.status.warning.text,
          '& .MuiAlert-icon': { color: flowVizTheme.colors.status.warning.accent },
        }}
      >
        <AlertTitle sx={{ fontSize: '0.9rem', fontWeight: 600 }}>No AI provider configured</AlertTitle>
        <Typography sx={{ fontSize: '0.85rem', opacity: 0.95 }}>
          Add an <code>ANTHROPIC_API_KEY</code> or <code>OPENAI_API_KEY</code> to your{' '}
          <code>.env</code> and restart the server.
        </Typography>
      </Alert>
    ) : (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          mb: 3,
          backgroundColor: flowVizTheme.colors.status.warning.bg,
          border: `1px solid ${flowVizTheme.colors.status.warning.border}`,
          borderRadius: flowVizTheme.borderRadius.lg,
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
                backgroundColor: flowVizTheme.colors.surface.recessed,
                padding: '2px 6px',
                borderRadius: flowVizTheme.borderRadius.xs,
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
                  backgroundColor: flowVizTheme.colors.surface.recessed,
                  padding: '2px 6px',
                  borderRadius: flowVizTheme.borderRadius.xs,
                  fontFamily: 'monospace',
                  fontSize: '0.8rem'
                }}>ANTHROPIC_API_KEY=your-key-here</code></li>
                <li>For GPT: <code style={{
                  backgroundColor: flowVizTheme.colors.surface.recessed,
                  padding: '2px 6px',
                  borderRadius: flowVizTheme.borderRadius.xs,
                  fontFamily: 'monospace',
                  fontSize: '0.8rem'
                }}>OPENAI_API_KEY=your-key-here</code></li>
              </Box>
              <li>Restart the server: <code style={{
                backgroundColor: flowVizTheme.colors.surface.recessed,
                padding: '2px 6px',
                borderRadius: flowVizTheme.borderRadius.xs,
                fontFamily: 'monospace',
                fontSize: '0.85rem'
              }}>npm run dev:full</code></li>
            </Box>
          </Box>
        </Box>
      </Paper>
    );

  const form = (
    <>
      {/* Input mode — compact monochrome segmented control. Centred on the
          landing page, where it sits under a centred hero; left-aligned in the
          dialog, where the title, the field and the copy all start at the same
          margin and a centred control is the only thing breaking the edge. */}
      <Box
        sx={{
          mb: compact ? 2 : 4,
          display: 'flex',
          justifyContent: compact ? 'flex-start' : 'center',
        }}
      >
        <SegmentedControl
          size={compact ? 'sm' : 'md'}
          aria-label="Input mode"
          options={INPUT_MODES}
          value={inputMode}
          onChange={onInputModeChange}
        />
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
            sx={{
              mb: compact ? 2.5 : 3,
              // The 56px hero field reads as a text area at dialog width.
              ...(compact && {
                '& .MuiOutlinedInput-root': { height: 44, fontSize: '0.9rem' },
              }),
            }}
          />
        ) : inputMode === 'pdf' ? (
          <Box key="pdf" sx={{ mb: compact ? 2.5 : 3 }}>
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
                py: compact ? 3 : 6,
                minHeight: compact ? 150 : 240,
                borderRadius: flowVizTheme.borderRadius.md,
                cursor: pdfBusy ? 'default' : 'pointer',
                // Match the URL/Text input fields: same panel background and
                // border treatment (default → emphasis on hover, focus on drag).
                border: `1.5px dashed ${
                  pdfStatus === 'error'
                    ? flowVizTheme.colors.surface.border.emphasis
                    : isDragging
                      ? flowVizTheme.colors.surface.border.focus
                      : flowVizTheme.colors.surface.border.default
                }`,
                backgroundColor: isDragging
                  ? flowVizTheme.colors.background.raised
                  : flowVizTheme.colors.background.panel,
                // Scope the transition (not `all`) so nothing flashes on toggle.
                transition: `border-color ${flowVizTheme.motion.fast}, background-color ${flowVizTheme.motion.fast}`,
                '&:hover': pdfBusy
                  ? undefined
                  : {
                      borderColor: flowVizTheme.colors.surface.border.emphasis,
                      backgroundColor: flowVizTheme.colors.background.raised,
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
                    Up to 20&nbsp;MB · 100 pages
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        ) : (
          <Box key="text" sx={{ mb: compact ? 2.5 : 3 }}>
            <SearchInputMultiline
              fullWidth
              multiline
              rows={compact ? 7 : 12}
              placeholder="Paste your article or report here"
              variant="outlined"
              value={textContent}
              onChange={(e) => onTextChange(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: pdfTextStats.isOverLimit
                    ? flowVizTheme.colors.surface.border.focus
                    : pdfTextStats.isNearLimit
                      ? flowVizTheme.colors.surface.border.emphasis
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
                  color: pdfTextStats.isOverLimit
                    ? flowVizTheme.colors.text.primary
                    : pdfTextStats.isNearLimit
                      ? flowVizTheme.colors.text.secondary
                      : flowVizTheme.colors.text.tertiary
                }}>
                  {pdfTextStats.chars.toLocaleString()} / {TEXT_LIMITS.MAX_CHARS.toLocaleString()} characters
                </Typography>
                {pdfTextStats.chars > 0 && (
                  <Typography variant="caption" sx={{ color: flowVizTheme.colors.text.tertiary }}>
                    ~{pdfTextStats.words.toLocaleString()} words
                  </Typography>
                )}
              </Box>

              {pdfTextStats.isNearLimit && (
                <Chip
                  size="small"
                  label={pdfTextStats.isOverLimit ? "Too Long" : "Near Limit"}
                  sx={{
                    fontSize: '0.7rem',
                    height: '20px',
                    color: flowVizTheme.colors.text.secondary,
                    backgroundColor: flowVizTheme.colors.surface.hover,
                    border: `1px solid ${flowVizTheme.colors.surface.border.subtle}`,
                    '& .MuiChip-label': {
                      px: 1
                    }
                  }}
                />
              )}
            </Box>
          </Box>
        )}

        {children}

        <Box
          sx={{
            position: 'relative',
            display: compact ? 'flex' : 'inline-flex',
            justifyContent: compact ? 'flex-end' : undefined,
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          {/* Decorative blur behind the hero button — landing page only. */}
          {!compact && (
            <>
              {/* First blur layer */}
              <Box
                sx={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  height: 'calc(100% + 2px)',
                  width: 'calc(100% + 2px)',
                  transform: 'translate(-50%, -50%)',
                  borderRadius: flowVizTheme.borderRadius.full,
                  willChange: 'transform',
                  opacity: 0.4,
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    height: '100%',
                    width: '100%',
                    borderRadius: flowVizTheme.borderRadius.full,
                    background: 'rgba(var(--fv-overlay-rgb), 0.03)',
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
                  borderRadius: flowVizTheme.borderRadius.full,
                  willChange: 'transform',
                  opacity: 0.2,
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    height: '100%',
                    width: '100%',
                    borderRadius: flowVizTheme.borderRadius.full,
                    background: 'rgba(var(--fv-overlay-rgb), 0.02)',
                  }}
                />
              </Box>
            </>
          )}

          <HeroSubmitButton
            variant="contained"
            type="submit"
            disabled={submitDisabled}
            isLoading={isLoading}
            // In the dialog this is a confirm button, not a hero call to
            // action: dialog-button geometry (same height, radius and type
            // scale as Save/Cancel elsewhere) instead of the 48px pill. The
            // loading shimmer stays — that part earns its keep on a request
            // that runs for tens of seconds.
            sx={
              compact
                ? {
                    height: 36,
                    px: '18px',
                    fontSize: '0.9rem',
                    borderRadius: flowVizTheme.borderRadius.md,
                    gap: 1,
                  }
                : undefined
            }
          >
            {!compact && (
              <SearchIcon sx={{ fontSize: 20, color: flowVizTheme.colors.text.primary }} />
            )}
            <span>{submitLabel ?? defaultSubmitLabel}</span>
          </HeroSubmitButton>
        </Box>
      </Box>
    </>
  );

  if (compact) {
    return (
      <>
        {providerWarning}
        {form}
      </>
    );
  }

  return (
    <>
      {providerWarning}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          backgroundColor: flowVizTheme.colors.background.panel,
          border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
          borderRadius: flowVizTheme.borderRadius.lg,
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
        {form}
      </Paper>
    </>
  );
}
