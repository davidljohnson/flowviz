import { EnhancedDialog, EnhancedTextField, FormSection, FormSectionTitle, SecondaryButton, PrimaryButton } from 'flowviz';
import { Surface } from '../preview-lib/theme';

/**
 * The dialog is only itself when open, so every cell renders it open. It
 * portals to the document body and covers the card, which is why this component
 * is pinned to single-card mode in the sync config.
 */
export const SettingsDialog = () => (
  <Surface>
    <EnhancedDialog
      open
      size="medium"
      title="Settings"
      subtitle="Choose the model that analyzes your articles"
      onClose={() => {}}
    >
      <FormSection>
        <FormSectionTitle>Model</FormSectionTitle>
        <EnhancedTextField fullWidth defaultValue="claude-opus-5" />
      </FormSection>
      <FormSection>
        <FormSectionTitle>Story speed</FormSectionTitle>
        <EnhancedTextField fullWidth defaultValue="3 seconds per step" />
      </FormSection>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <SecondaryButton>Cancel</SecondaryButton>
        <PrimaryButton>Save</PrimaryButton>
      </div>
    </EnhancedDialog>
  </Surface>
);
