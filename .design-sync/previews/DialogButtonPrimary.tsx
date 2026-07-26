import { DialogButtonPrimary, DialogButtonSecondary, DialogButtonCancel } from 'flowviz';
import { Surface, BothModes } from '../preview-lib/theme';

export const Default = () => (
  <Surface>
    <DialogButtonPrimary>Save changes</DialogButtonPrimary>
  </Surface>
);

export const Disabled = () => (
  <Surface>
    <DialogButtonPrimary disabled>Save changes</DialogButtonPrimary>
  </Surface>
);

/** The three dialog buttons together — the hierarchy is the point. */
export const TheFullSet = () => (
  <Surface width={520}>
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', whiteSpace: 'nowrap' }}>
      <DialogButtonCancel>Cancel</DialogButtonCancel>
      <DialogButtonSecondary>Save a copy</DialogButtonSecondary>
      <DialogButtonPrimary>Save changes</DialogButtonPrimary>
    </div>
  </Surface>
);

export const DarkAndLight = () => (
  <BothModes width={400}>
    <div style={{ display: 'flex', gap: 8 }}>
      <DialogButtonCancel>Cancel</DialogButtonCancel>
      <DialogButtonSecondary>Save a copy</DialogButtonSecondary>
      <DialogButtonPrimary>Save</DialogButtonPrimary>
    </div>
  </BothModes>
);
