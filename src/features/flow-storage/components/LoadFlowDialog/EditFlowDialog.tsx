import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { FlowDialogTitle } from '../../../../shared/components/Typography';
import { 
  PrimaryButton,
  SecondaryButton 
} from '../../../../shared/components/EnhancedDialog';
import { 
  EnhancedTextField
} from '../../../../shared/components/EnhancedForm';

interface EditFlowDialogProps {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onSave: () => void;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
}

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
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableRestoreFocus
      disableEnforceFocus
      PaperProps={{
        sx: {
          background: 'rgba(var(--fv-glass-rgb), 0.95)',
          border: '1px solid rgba(var(--fv-overlay-rgb), 0.1)',
          borderRadius: '16px',
          backdropFilter: 'blur(20px)',
          maxWidth: '600px',
          width: '100%',
          overflow: 'hidden',
        }
      }}
    >
      <FlowDialogTitle>
        Edit Analysis
      </FlowDialogTitle>
      
      <DialogContent sx={{ 
        px: 3, 
        pt: 2,
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
            placeholder="Brief description of this analysis..."
          />
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ 
        px: 3, 
        pb: 3, 
        pt: 2,
        gap: 1
      }}>
        <SecondaryButton 
          onClick={onClose}
          startIcon={<CloseIcon />}
        >
          Cancel
        </SecondaryButton>
        <PrimaryButton 
          onClick={onSave}
          startIcon={<CheckIcon />}
          disabled={!title.trim()}
        >
          Save Changes
        </PrimaryButton>
      </DialogActions>
    </Dialog>
  );
};

export default EditFlowDialog;