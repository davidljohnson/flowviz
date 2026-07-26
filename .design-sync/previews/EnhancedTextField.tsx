import { EnhancedTextField } from 'flowviz';
import { Surface, BothModes } from '../preview-lib/theme';

export const Default = () => (
  <Surface width={420}>
    <EnhancedTextField fullWidth label="Technique name" defaultValue="Spearphishing Attachment" />
  </Surface>
);

export const Placeholder = () => (
  <Surface width={420}>
    <EnhancedTextField fullWidth label="ATT&CK ID" placeholder="T1566.001" />
  </Surface>
);

export const States = () => (
  <Surface width={420}>
    <div style={{ display: 'grid', gap: 14 }}>
      <EnhancedTextField fullWidth label="Name" defaultValue="Scheduled Task/Job" />
      <EnhancedTextField fullWidth label="ATT&CK ID" defaultValue="T1053.005x" error helperText="Not a known technique ID" />
      <EnhancedTextField fullWidth label="Source" defaultValue="paragraph 4" disabled />
    </div>
  </Surface>
);

export const Multiline = () => (
  <Surface width={420}>
    <EnhancedTextField
      fullWidth
      multiline
      rows={4}
      label="Description"
      defaultValue="A macro-enabled Word document sent to three finance-team mailboxes, disguised as an overdue invoice."
    />
  </Surface>
);

export const DarkAndLight = () => (
  <BothModes width={400}>
    <EnhancedTextField fullWidth label="Technique name" defaultValue="Spearphishing Attachment" />
  </BothModes>
);
