import { useRef, useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  AlertTitle,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloseIcon from '@mui/icons-material/Close';
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

/** The PDF row's primary line: takes the slack and truncates, since a filename
 *  or an error message can be any length and the row's height cannot. */
const rowTextSx = {
  flex: 1,
  minWidth: 0,
  fontSize: '0.9rem',
  fontWeight: 500,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
};

/** The trailing detail — page count, character count. Never truncates; the
 *  primary line yields to it. */
const rowMetaSx = {
  flexShrink: 0,
  fontSize: '0.75rem',
  color: flowVizTheme.colors.text.tertiary,
};

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
  /** Rendered between the input and the submit button (the merge/replace choice). */
  children?: React.ReactNode;
  /** Overrides the submit label, which otherwise names the input mode. */
  submitLabel?: string;
}

/**
 * The analysis form — mode switch, URL/text/PDF input, the client-side PDF
 * pipeline, and submit.
 *
 * It once had a second, roomier presentation for a landing page that no longer
 * exists (a panel card, a hero-sized submit pill, decorative glow layers behind
 * it). AnalyzeDialog is the only caller, so the form is now written for a dialog
 * and nothing else.
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

  const clearPdf = () => {
    setPdfFileName(null);
    setPdfStatus('idle');
    setPdfProgress(null);
    setPdfError('');
    onTextChange('');
  };

  const pdfTextStats = getTextStats(textContent);
  const pdfBusy = pdfStatus === 'processing' || pdfStatus === 'vision';

  /**
   * Drag handlers for the whole form, not just the PDF row.
   *
   * The row is a 44px field, which would be a mean target to hit with a file;
   * the dialog is what the user is actually aiming at. Only armed in PDF mode,
   * so a stray file over the URL field does nothing.
   *
   * dragleave fires when the pointer crosses into a *child*, so the flag has to
   * survive that — hence the relatedTarget containment check rather than a plain
   * setIsDragging(false).
   */
  const dropTargetProps =
    inputMode !== 'pdf' || pdfBusy
      ? {}
      : {
          onDragOver: (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(true);
          },
          onDragLeave: (e: React.DragEvent) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDragging(false);
          },
          onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handlePdfFile(file);
          },
        };

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
    providersLoading || hasConfiguredProviders ? null : (
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
    );

  const form = (
    <>
      {/* Input mode. Left-aligned: the title, the field and the copy all start
          at the same margin, and a centred control would be the only thing
          breaking that edge. */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start' }}>
        <SegmentedControl
          aria-label="Input mode"
          options={INPUT_MODES}
          value={inputMode}
          onChange={onInputModeChange}
        />
      </Box>

      <Box component="form" onSubmit={onSubmit} {...dropTargetProps}>
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
              mb: 2.5,
              // 44px, not the field's own 56px, which reads as a text area at
              // dialog width.
              '& .MuiOutlinedInput-root': { height: 44, fontSize: '0.9rem' },
            }}
          />
        ) : inputMode === 'pdf' ? (
          <Box key="pdf" sx={{ mb: 2.5 }}>
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
            {/* A field, not a dropzone.
                Every state keeps the URL field's geometry — 44px, solid border,
                left-aligned — so switching modes doesn't resize the dialog and
                a one-click action doesn't outweigh the URL you actually type.
                The dashed rectangle this replaces advertised drop-ability at
                rest; the highlight now appears while a file is overhead, which
                is when it means something. */}
            <Box
              onClick={() => !pdfBusy && fileInputRef.current?.click()}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                height: 44,
                px: 1.5,
                position: 'relative',
                overflow: 'hidden',
                borderRadius: flowVizTheme.borderRadius.md,
                cursor: pdfBusy ? 'default' : 'pointer',
                border: `1px solid ${
                  pdfStatus === 'error'
                    ? flowVizTheme.colors.status.error.border
                    : isDragging
                      ? flowVizTheme.colors.surface.border.focus
                      : flowVizTheme.colors.surface.border.default
                }`,
                backgroundColor: isDragging
                  ? flowVizTheme.colors.background.raised
                  : flowVizTheme.colors.background.panel,
                transition: `border-color ${flowVizTheme.motion.fast}, background-color ${flowVizTheme.motion.fast}`,
                '&:hover': pdfBusy
                  ? undefined
                  : {
                      borderColor:
                        pdfStatus === 'error'
                          ? flowVizTheme.colors.status.error.border
                          : flowVizTheme.colors.surface.border.emphasis,
                      backgroundColor: flowVizTheme.colors.background.raised,
                    },
              }}
            >
              {pdfBusy ? (
                <>
                  <CircularProgress
                    size={16}
                    thickness={5}
                    sx={{ color: flowVizTheme.colors.text.tertiary, flexShrink: 0 }}
                  />
                  <Typography sx={{ ...rowTextSx, color: flowVizTheme.colors.text.primary }}>
                    {pdfStatus === 'vision' ? 'Analyzing diagrams…' : 'Extracting text…'}
                  </Typography>
                  <Typography sx={rowMetaSx}>
                    {pdfStatus === 'vision'
                      ? 'Reading images'
                      : pdfProgress
                        ? `Page ${pdfProgress.page} of ${pdfProgress.total}`
                        : 'Reading document…'}
                  </Typography>
                  {/* Determinate where the extractor reports pages, which is the
                      long phase; a 2px rule inside the field's own radius rather
                      than a row of its own. */}
                  {pdfProgress && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        bottom: 0,
                        height: 2,
                        width: `${Math.round((pdfProgress.page / pdfProgress.total) * 100)}%`,
                        backgroundColor: flowVizTheme.colors.text.tertiary,
                        transition: `width ${flowVizTheme.motion.normal}`,
                      }}
                    />
                  )}
                </>
              ) : pdfStatus === 'done' ? (
                <>
                  <PictureAsPdfIcon
                    sx={{ fontSize: 18, color: flowVizTheme.colors.text.secondary, flexShrink: 0 }}
                  />
                  <Typography sx={{ ...rowTextSx, color: flowVizTheme.colors.text.primary }}>
                    {pdfFileName}
                  </Typography>
                  <Typography
                    sx={{
                      ...rowMetaSx,
                      color: pdfTextStats.isOverLimit
                        ? flowVizTheme.colors.status.error.text
                        : flowVizTheme.colors.text.tertiary,
                    }}
                  >
                    {pdfTextStats.isOverLimit
                      ? `Too long — max ${TEXT_LIMITS.MAX_CHARS.toLocaleString()}`
                      : `${pdfTextStats.chars.toLocaleString()} characters`}
                  </Typography>
                  <Tooltip title="Remove">
                    <IconButton
                      size="small"
                      aria-label="Remove PDF"
                      // Without this the click reaches the row and reopens the
                      // file picker, so removing a file would ask for another.
                      onClick={(e) => {
                        e.stopPropagation();
                        clearPdf();
                      }}
                      sx={{
                        flexShrink: 0,
                        p: 0.25,
                        color: flowVizTheme.colors.text.tertiary,
                        '&:hover': {
                          color: flowVizTheme.colors.text.primary,
                          backgroundColor: flowVizTheme.colors.surface.hover,
                        },
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </>
              ) : pdfStatus === 'error' ? (
                <>
                  <WarningAmberIcon
                    sx={{ fontSize: 18, color: flowVizTheme.colors.status.error.accent, flexShrink: 0 }}
                  />
                  <Typography
                    title={pdfError}
                    sx={{ ...rowTextSx, color: flowVizTheme.colors.status.error.text }}
                  >
                    {pdfError}
                  </Typography>
                  <Typography sx={rowMetaSx}>Click to retry</Typography>
                </>
              ) : (
                <>
                  <UploadFileIcon
                    sx={{ fontSize: 18, color: flowVizTheme.colors.text.tertiary, flexShrink: 0 }}
                  />
                  <Typography sx={{ ...rowTextSx, color: flowVizTheme.colors.text.secondary }}>
                    {isDragging ? 'Drop to upload' : 'Choose a PDF, or drop one here'}
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        ) : (
          <Box key="text" sx={{ mb: 2.5 }}>
            <SearchInputMultiline
              fullWidth
              multiline
              rows={7}
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

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <HeroSubmitButton
            type="submit"
            disabled={submitDisabled}
            isLoading={isLoading}
            // A confirm button, not a call to action: the same height, radius
            // and type scale as Save/Cancel elsewhere rather than a 48px pill.
            // The loading shimmer stays — that earns its keep on a request that
            // runs for tens of seconds.
            sx={{
              height: 36,
              px: '18px',
              fontSize: '0.9rem',
              borderRadius: flowVizTheme.borderRadius.md,
              gap: 1,
            }}
          >
            <span>{submitLabel ?? defaultSubmitLabel}</span>
          </HeroSubmitButton>
        </Box>
      </Box>
    </>
  );

  return (
    <>
      {providerWarning}
      {form}
    </>
  );
}
