import { FlowToast } from 'flowviz';
import { Surface, BothModes } from '../preview-lib/theme';

export const AllStatuses = () => (
  <Surface width={420}>
    <div style={{ display: 'grid', gap: 10 }}>
      <FlowToast status="success" message="Flow saved to local storage" />
      <FlowToast status="info" message="Re-laid out 14 nodes" />
      <FlowToast status="warning" message="Two techniques could not be mapped to ATT&CK" />
      <FlowToast status="error" message="Export failed — the flow has no nodes" />
    </div>
  </Surface>
);

/** With `onClose` the toast becomes clickable and gains a hover state. */
export const Dismissible = () => (
  <Surface width={420}>
    <FlowToast status="success" message="Copied STIX bundle to clipboard" onClose={() => {}} />
  </Surface>
);

export const DarkAndLight = () => (
  <BothModes width={400}>
    <FlowToast status="info" message="Re-laid out 14 nodes" />
  </BothModes>
);
