import React from 'react';
import { Typography } from '@mui/material';
import {
  EnhancedDialog,
  EnhancedDialogContent,
  EnhancedDialogActions,
  PrimaryButton,
  SecondaryButton,
} from '../../../../shared/components/EnhancedDialog';
import { flowVizTheme } from '../../../../shared/theme/flowviz-theme';

interface DeleteFlowDialogProps {
  /** The analysis awaiting confirmation, or null when nothing is. Doubles as
   *  the open flag so the title can't be read from a flow that's already gone. */
  title: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirms deleting one saved analysis.
 *
 * This replaced a window.confirm, which drew the operating system's own dialog
 * on top of a styled modal — unthemeable, unpositioned, and the only place in
 * the app where a decision was asked that way. It follows NewSearchDialog: the
 * question is the title, and the body says what is at stake.
 *
 * The confirm button carries the error tokens rather than the neutral primary,
 * because the two buttons here are not equal choices. Styled at the call site
 * rather than as a shared DangerButton — this is the only destructive
 * confirmation in the app, and one consumer is not a pattern yet.
 */
const DeleteFlowDialog: React.FC<DeleteFlowDialogProps> = ({
  title,
  onClose,
  onConfirm,
}) => {
  return (
    <EnhancedDialog
      open={title !== null}
      onClose={onClose}
      title="Delete this analysis?"
      maxWidth="sm"
      fullWidth
      size="small"
    >
      <EnhancedDialogContent>
        <Typography
          sx={{
            fontSize: '0.85rem',
            lineHeight: 1.6,
            color: flowVizTheme.colors.text.secondary,
          }}
        >
          {/* Naming it matters: the menu that opened this sits on one row of a
              list of similar titles. */}
          <Typography component="span" sx={{ color: flowVizTheme.colors.text.primary, fontWeight: 500 }}>
            {title}
          </Typography>
          {' will be removed from this browser. This cannot be undone.'}
        </Typography>
      </EnhancedDialogContent>

      <EnhancedDialogActions>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton
          onClick={onConfirm}
          sx={{
            backgroundColor: flowVizTheme.colors.status.error.bg,
            borderColor: flowVizTheme.colors.status.error.border,
            color: flowVizTheme.colors.status.error.text,
            '&:hover': {
              backgroundColor: flowVizTheme.colors.status.error.bg,
              borderColor: flowVizTheme.colors.status.error.accent,
            },
          }}
        >
          Delete
        </PrimaryButton>
      </EnhancedDialogActions>
    </EnhancedDialog>
  );
};

export default DeleteFlowDialog;
