import { EnhancedSelect, EnhancedMenuItem, EnhancedFormControl, FormSection, FormSectionTitle } from 'flowviz';
import { Surface } from '../preview-lib/theme';

/** Closed is the state that documents the control; the menu is its own card. */
export const Closed = () => (
  <Surface width={380}>
    <EnhancedFormControl fullWidth>
      <EnhancedSelect fullWidth value="anthropic">
        <EnhancedMenuItem value="anthropic">Anthropic</EnhancedMenuItem>
        <EnhancedMenuItem value="openai">OpenAI</EnhancedMenuItem>
      </EnhancedSelect>
    </EnhancedFormControl>
  </Surface>
);

/** In the form section it ships in — the Settings dialog's provider picker. */
export const InAFormSection = () => (
  <Surface width={400}>
    <FormSection>
      <FormSectionTitle>AI provider</FormSectionTitle>
      <EnhancedFormControl fullWidth>
        <EnhancedSelect fullWidth value="claude-opus-5">
          <EnhancedMenuItem value="claude-opus-5">claude-opus-5</EnhancedMenuItem>
          <EnhancedMenuItem value="claude-sonnet-5">claude-sonnet-5</EnhancedMenuItem>
          <EnhancedMenuItem value="gpt-4o">gpt-4o</EnhancedMenuItem>
        </EnhancedSelect>
      </EnhancedFormControl>
    </FormSection>
  </Surface>
);

export const Disabled = () => (
  <Surface width={380}>
    <EnhancedFormControl fullWidth>
      <EnhancedSelect fullWidth value="anthropic" disabled>
        <EnhancedMenuItem value="anthropic">Anthropic</EnhancedMenuItem>
      </EnhancedSelect>
    </EnhancedFormControl>
  </Surface>
);
