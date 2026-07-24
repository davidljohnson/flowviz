import { Box, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  EnhancedDialog,
  EnhancedDialogContent,
} from '../../../shared/components/EnhancedDialog';
import SegmentedControl from '../../../shared/components/SegmentedControl';
import { flowVizTheme } from '../../../shared/theme/flowviz-theme';
import AnalysisInput from './AnalysisInput';

export type AnalyzeMode = 'merge' | 'replace';

interface AnalyzeDialogProps {
  open: boolean;
  onClose: () => void;
  mode: AnalyzeMode;
  onModeChange: (mode: AnalyzeMode) => void;
  hasUnsavedChanges: boolean;
  /** Hides the merge/replace choice when there is nothing to merge into. */
  canvasHasContent: boolean;

  // Forwarded to AnalysisInput
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
}

const MODE_OPTIONS = [
  { value: 'merge' as const, label: 'Add to canvas' },
  { value: 'replace' as const, label: 'Replace canvas' },
];

/**
 * Analyse a report without leaving the canvas. The same form the landing page
 * uses, plus the choice of what to do with the flow already on screen — which
 * is what lets one attack flow be built from several reports.
 */
export default function AnalyzeDialog({
  open,
  onClose,
  mode,
  onModeChange,
  hasUnsavedChanges,
  canvasHasContent,
  ...inputProps
}: AnalyzeDialogProps) {
  const replacing = canvasHasContent && mode === 'replace';

  return (
    <EnhancedDialog
      open={open}
      onClose={onClose}
      title="Analyze a report"
      subtitle="Reads a threat intel report and maps each attack step to a MITRE ATT&CK technique."
      size="medium"
    >
      <EnhancedDialogContent>
        <AnalysisInput
          {...inputProps}
          compact
          // With a flow already on the canvas, the button names what happens to
          // it and mirrors the toggle above. Empty canvas has no toggle, so it
          // falls through to the plain "Analyze report".
          submitLabel={
            canvasHasContent
              ? mode === 'merge'
                ? 'Add to canvas'
                : 'Replace canvas'
              : undefined
          }
        >
          {canvasHasContent && (
            <Box sx={{ mb: 2.5 }}>
              <Typography
                component="label"
                sx={{
                  display: 'block',
                  color: flowVizTheme.colors.text.tertiary,
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  mb: 0.75,
                }}
              >
                This canvas
              </Typography>
              <SegmentedControl
                fullWidth
                aria-label="What to do with the current flow"
                options={MODE_OPTIONS}
                value={mode}
                onChange={onModeChange}
              />
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 0.75,
                  mt: 1.25,
                  color: replacing
                    ? flowVizTheme.colors.status.warning.text
                    : flowVizTheme.colors.text.tertiary,
                }}
              >
                {replacing ? (
                  <WarningAmberIcon sx={{ fontSize: '0.95rem', mt: '1px', flexShrink: 0 }} />
                ) : (
                  <InfoOutlinedIcon sx={{ fontSize: '0.95rem', mt: '1px', flexShrink: 0 }} />
                )}
                <Typography sx={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
                  {replacing
                    ? hasUnsavedChanges
                      ? 'Replaces the current flow. You have unsaved changes — they will be lost.'
                      : 'Replaces the current flow. The nodes on screen now will be discarded.'
                    : 'Keeps the current flow and adds the new one below it. Nodes already on the canvas stay where you put them.'}
                </Typography>
              </Box>
            </Box>
          )}
        </AnalysisInput>
      </EnhancedDialogContent>
    </EnhancedDialog>
  );
}
