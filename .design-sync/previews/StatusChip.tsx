import { StatusChip } from 'flowviz';
import { Surface, BothModes } from '../preview-lib/theme';

export const AllStatuses = () => (
  <Surface>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <StatusChip status="success" label="verified" />
      <StatusChip status="info" label="enriched" />
      <StatusChip status="warning" label="inferred" />
      <StatusChip status="error" label="unmapped" />
    </div>
  </Surface>
);

export const Outlined = () => (
  <Surface>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <StatusChip status="success" label="verified" variant="outlined" />
      <StatusChip status="warning" label="inferred" variant="outlined" />
      <StatusChip status="error" label="unmapped" variant="outlined" />
    </div>
  </Surface>
);

/** Both sizes, filled — the label is uppercased by the component. */
export const Sizes = () => (
  <Surface>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <StatusChip status="info" label="small" size="small" />
      <StatusChip status="info" label="medium" size="medium" />
    </div>
  </Surface>
);

export const DarkAndLight = () => (
  <BothModes>
    <div style={{ display: 'flex', gap: 8 }}>
      <StatusChip status="success" label="verified" />
      <StatusChip status="warning" label="inferred" />
      <StatusChip status="error" label="unmapped" />
    </div>
  </BothModes>
);
