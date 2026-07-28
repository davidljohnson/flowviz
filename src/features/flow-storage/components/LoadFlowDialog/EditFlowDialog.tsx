import React from 'react';
import { Box } from '@mui/material';
import {
  EnhancedDialog,
  EnhancedDialogContent,
  EnhancedDialogActions,
  PrimaryButton,
  SecondaryButton
} from '../../../../shared/components/EnhancedDialog';
import {
  EnhancedTextField
} from '../../../../shared/components/EnhancedForm';

interface EditFlowDialogProps {
  open: boolean;
  /** The analysis's title, being edited — not this dialog's own heading. */
  title: string;
  description: string;
  onClose: () => void;
  onSave: () => void;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

/**
 * Renames a saved analysis and edits its description.
 *
 * It was the last dialog in the app built on a raw MUI Dialog, with its own
 * PaperProps restating what createPanelStyle already says — a translucent panel
 * fill, a hand-set border and radius — and its own FlowDialogTitle duplicating
 * the title EnhancedDialog styles internally, down to the same type step and
 * weight. On the house component now, so the panel, the scrim, the close button
 * and the focus behaviour all come from one place, and it matches SaveFlowDialog
 * beside it: the same width, the same content overrides, the same two fields.
 *
 * Heading is "Edit details", matching the menu item that opens it. It used to
 * say "Edit Analysis" while the menu said "Edit details".
 */
const EditFlowDialog: React.FC<EditFlowDialogProps> = ({
  open,
  title,
  description,
  onClose,
  onSave,
  onTitleChange,
  onDescriptionChange,
  onKeyPress,
}) => {
  return (
    <EnhancedDialog
      open={open}
      onClose={onClose}
      title="Edit details"
      maxWidth="sm"
      fullWidth
      dialogMaxWidth="600px"
    >
      <EnhancedDialogContent sx={{
        overflow: 'visible',
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}>
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
            onChange={(e) => onTitleChange(e.target.value)}
            onKeyDown={onKeyPress}
            fullWidth
            required
            placeholder="e.g., APT29 SolarWinds Analysis"
            sx={{ mt: 2 }}
          />

          <EnhancedTextField
            label="Description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            onKeyDown={onKeyPress}
            fullWidth
            multiline
            rows={3}
            placeholder="Brief description of this analysis…"
          />
        </Box>
      </EnhancedDialogContent>

      <EnhancedDialogActions>
        <SecondaryButton onClick={onClose}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          onClick={onSave}
          disabled={!title.trim()}
        >
          Save
        </PrimaryButton>
      </EnhancedDialogActions>
    </EnhancedDialog>
  );
};

export default EditFlowDialog;
