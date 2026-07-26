import { DangerButton, DialogButtonPrimary, DialogButtonCancel } from 'flowviz';
import { Surface, BothModes } from '../preview-lib/theme';

export const Default = () => (
  <Surface>
    <DangerButton>Delete flow</DangerButton>
  </Surface>
);

export const Disabled = () => (
  <Surface>
    <DangerButton disabled>Delete flow</DangerButton>
  </Surface>
);

/** Where it actually appears — the destructive action in a dialog footer. */
export const InDialogFooter = () => (
  <Surface width={380}>
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
      <DialogButtonCancel>Cancel</DialogButtonCancel>
      <DangerButton>Delete flow</DangerButton>
    </div>
  </Surface>
);

export const AgainstPrimary = () => (
  <BothModes width={380}>
    <div style={{ display: 'flex', gap: 8 }}>
      <DialogButtonPrimary>Save</DialogButtonPrimary>
      <DangerButton>Delete</DangerButton>
    </div>
  </BothModes>
);
