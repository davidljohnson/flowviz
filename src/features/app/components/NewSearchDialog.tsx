import {
  EnhancedDialog,
  EnhancedDialogContent,
  EnhancedDialogActions,
  SecondaryButton,
  PrimaryButton,
} from '../../../shared/components/EnhancedDialog';
import {
  FlowDialogContent,
} from '../../../shared/components/Typography';

interface NewSearchDialogProps {
  open: boolean;
  hasUnsavedChanges: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSaveFirst: () => void;
}

export default function NewSearchDialog({
  open,
  hasUnsavedChanges,
  onClose,
  onConfirm,
  onSaveFirst,
}: NewSearchDialogProps) {
  return (
    <EnhancedDialog
      open={open}
      onClose={onClose}
      title="Clear the canvas?"
      size="small"
    >
      <EnhancedDialogContent>
        <FlowDialogContent>
          {hasUnsavedChanges ? (
            <>
              You have unsaved changes to this flow.
              Would you like to save before clearing it?
            </>
          ) : (
            <>
              This empties the canvas so you can start again.
              The current flow will be lost.
            </>
          )}
        </FlowDialogContent>
      </EnhancedDialogContent>
      
      <EnhancedDialogActions>
        {hasUnsavedChanges ? (
          <>
            <SecondaryButton onClick={onClose}>
              Cancel
            </SecondaryButton>
            
            <SecondaryButton onClick={onConfirm}>
              Don't Save
            </SecondaryButton>
            
            <PrimaryButton onClick={onSaveFirst}>
              Save First
            </PrimaryButton>
          </>
        ) : (
          <>
            <SecondaryButton onClick={onClose}>
              Cancel
            </SecondaryButton>
            
            <PrimaryButton onClick={onConfirm}>
              Start New Search
            </PrimaryButton>
          </>
        )}
      </EnhancedDialogActions>
    </EnhancedDialog>
  );
}