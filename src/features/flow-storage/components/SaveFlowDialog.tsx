import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { FlowAlert } from '../../../shared/components/Alert';
import { 
  EnhancedDialog,
  EnhancedDialogContent,
  EnhancedDialogActions,
  PrimaryButton,
  SecondaryButton 
} from '../../../shared/components/EnhancedDialog';
import { 
  EnhancedTextField
} from '../../../shared/components/EnhancedForm';
import { Node, Edge, Viewport } from 'reactflow';
import { SavedFlow, SavedAssistantMessage } from '../types/SavedFlow';
import { flowStorage, StorageError } from '../services';
import { flowVizTheme } from '../../../shared/theme/flowviz-theme';

interface SaveFlowDialogProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  sourceUrl?: string;
  sourceText?: string;
  /** The vision pass's reading, or null when it did not run. See SavedFlow. */
  visionText?: string | null;
  inputMode: 'url' | 'text';
  viewport?: Viewport;
  /** Assistant conversation to carry with the flow. */
  assistantMessages?: SavedAssistantMessage[];
  /** When set, offers updating that stored flow in place besides save-as-copy. */
  existingFlowId?: string | null;
  onSave: (flow: SavedFlow) => void;
}

/**
 * The host of a source URL, or null if it can't be parsed.
 *
 * `new URL()` throws on anything malformed, and nothing guarantees sourceUrl is
 * well formed: validateFlow copies it through unchecked, so an imported file can
 * carry any string, and loading such a flow puts it straight into App's
 * submittedUrl. This component is mounted whenever there is save data — not only
 * while open — so an unguarded parse in its body took the whole app down to the
 * error boundary the moment that flow was loaded, before the dialog was ever
 * shown. generateTitle already caught this for its own parse; the summary line
 * did not.
 */
const hostnameOf = (url: string | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

const SaveFlowDialog: React.FC<SaveFlowDialogProps> = ({
  open,
  onClose,
  nodes,
  edges,
  sourceUrl,
  sourceText,
  visionText,
  inputMode,
  viewport,
  assistantMessages,
  existingFlowId,
  onSave
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingFlow, setExistingFlow] = useState<SavedFlow | null>(null);

  const sourceHost = hostnameOf(sourceUrl);

  /**
   * An empty canvas can be saved today: the dialog opens with an auto-generated
   * title, so the only condition on the button — a non-blank title — is already
   * met, and you get a stored analysis with no nodes in it. The count line used
   * to be the only thing standing in the way, which is to say nothing was.
   */
  const isEmpty = nodes.length === 0;

  // Load the flow being updated (prefills title/description) or
  // auto-generate a title for a fresh save
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    if (existingFlowId) {
      flowStorage.loadFlow(existingFlowId)
        .then(flow => {
          if (cancelled) return;
          setExistingFlow(flow);
          setTitle(prev => prev || flow.title);
          setDescription(prev => prev || flow.metadata.description || '');
        })
        .catch(() => {
          // Stored flow is gone (deleted); fall back to save-as-new
          if (!cancelled) {
            setExistingFlow(null);
            generateTitle();
          }
        });
    } else if (!title) {
      generateTitle();
    }

    return () => {
      cancelled = true;
    };
  }, [open, existingFlowId, sourceUrl, inputMode]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setError(null);
      setSaving(false);
      setExistingFlow(null);
    }
  }, [open]);

  const generateTitle = () => {
    const date = new Date().toLocaleDateString();
    
    if (inputMode === 'url' && sourceHost) {
      setTitle(`Analysis from ${sourceHost.replace('www.', '')} - ${date}`);
    } else if (inputMode === 'url') {
      setTitle(`URL analysis - ${date}`);
    } else {
      setTitle(`Text analysis - ${date}`);
    }
  };

  const extractTechniquesAndTactics = () => {
    const techniques: string[] = [];
    const tactics: string[] = [];
    
    nodes.forEach(node => {
      if (node.data.techniques) {
        techniques.push(...node.data.techniques);
      }
      if (node.data.tactics) {
        tactics.push(...node.data.tactics);
      }
    });
    
    return {
      techniques: [...new Set(techniques)],
      tactics: [...new Set(tactics)]
    };
  };

  const handleSave = async (mode: 'new' | 'update' = 'new') => {
    if (!title.trim() || isEmpty) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { techniques, tactics } = extractTechniquesAndTactics();
      const updating = mode === 'update' && existingFlow;

      // Updating keeps the stored id (LocalStorageService upserts by id) and
      // original creation date; save-as-copy mints a fresh record
      const flow: SavedFlow = {
        id: updating ? existingFlow.id : crypto.randomUUID(),
        title: title.trim(),
        sourceUrl: updating ? (sourceUrl || existingFlow.sourceUrl) : sourceUrl,
        sourceText: updating ? (sourceText || existingFlow.sourceText) : sourceText,
        // `||` would be wrong here: null is a real answer ("no images"), and
        // falling back past it to the stored value would relabel the corpus.
        visionText: updating && visionText === undefined ? existingFlow.visionText : visionText,
        inputMode: updating ? existingFlow.inputMode : inputMode,
        nodes,
        edges,
        metadata: {
          createdAt: updating ? existingFlow.metadata.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: '1.0.0',
          description: description.trim() || undefined,
          tags: updating ? existingFlow.metadata.tags : [],
          nodeCount: nodes.length,
          edgeCount: edges.length,
        },
        visualization: {
          viewport,
        },
        assistantMessages: assistantMessages?.length ? assistantMessages : undefined,
        analysis: {
          extractedTechniques: techniques,
          extractedTactics: tactics
        }
      };

      await flowStorage.saveFlow(flow);
      onSave(flow);
      onClose();
    } catch (err) {
      if (err instanceof StorageError) {
        setError(err.message);
      } else {
        setError('Could not save. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <EnhancedDialog 
      open={open} 
      onClose={onClose}
      title="Save analysis"
      maxWidth="sm"
      fullWidth
      dialogMaxWidth="600px"
    >
      <EnhancedDialogContent sx={{ 
        overflow: 'visible',
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}>
        {error && (
          <FlowAlert
            status="error"
            sx={{ mb: 2 }}
          >
            {error}
          </FlowAlert>
        )}
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 2.5, 
          mt: 1,
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
        }}>
          <EnhancedTextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            placeholder="e.g., APT29 SolarWinds Analysis"
            sx={{ mt: 2 }}
          />
          
          <EnhancedTextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            placeholder="Brief description of this analysis…"
          />
          
          {/* The node and edge counts are gone. The one job they did was letting
              you notice you were about to save nothing — which is a rule, not a
              fact to print and hope is read, so it is enforced below instead.
              What's left is where the report came from, which the canvas behind
              this doesn't say. */}
          {(isEmpty || sourceHost) && (
            <Typography
              sx={{
                fontSize: '0.78rem',
                lineHeight: 1.5,
                color: isEmpty
                  ? flowVizTheme.colors.text.secondary
                  : flowVizTheme.colors.text.tertiary,
                wordBreak: 'break-word',
              }}
            >
              {isEmpty
                ? 'There is nothing on the canvas to save yet.'
                : `From ${sourceHost}`}
            </Typography>
          )}
        </Box>

        {/* No progress bar. It was indeterminate, so it carried no information,
            and it measured a synchronous localStorage write — it appeared and
            vanished within a frame while adding height and shifting the dialog
            as it went. The disabled buttons and the "Saving…" label say the same
            thing without moving anything. */}
      </EnhancedDialogContent>

      <EnhancedDialogActions>
        <SecondaryButton
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </SecondaryButton>
        {existingFlow && (
          <SecondaryButton
            onClick={() => handleSave('new')}
            disabled={saving || !title.trim() || isEmpty}
            // Three buttons, two of which write: this one needs to read as an
            // action rather than as a second Cancel, which is what it looked
            // like when both were the same bare ghost. An outline puts it
            // between the two — plainly a thing that does something, plainly
            // not the thing the button beside it does.
            sx={{
              border: `1px solid ${flowVizTheme.colors.surface.border.default}`,
              '&:hover': {
                border: `1px solid ${flowVizTheme.colors.surface.border.emphasis}`,
              },
            }}
          >
            Save as copy
          </SecondaryButton>
        )}
        <PrimaryButton
          onClick={() => handleSave(existingFlow ? 'update' : 'new')}
          disabled={saving || !title.trim() || isEmpty}
        >
          {saving ? 'Saving…' : existingFlow ? 'Update' : 'Save'}
        </PrimaryButton>
      </EnhancedDialogActions>
    </EnhancedDialog>
  );
};

export default SaveFlowDialog;