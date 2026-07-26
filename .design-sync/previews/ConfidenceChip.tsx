import { ConfidenceChip } from 'flowviz';
import { Surface, BothModes } from '../preview-lib/theme';

/** The three levels map onto success / warning / error internally. */
export const AllLevels = () => (
  <Surface>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <ConfidenceChip confidence="high" />
      <ConfidenceChip confidence="medium" />
      <ConfidenceChip confidence="low" />
    </div>
  </Surface>
);

/** Without the tooltip wrapper — the bare chip, for dense rows. */
export const WithoutTooltip = () => (
  <Surface>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <ConfidenceChip confidence="high" showTooltip={false} />
      <ConfidenceChip confidence="low" showTooltip={false} />
    </div>
  </Surface>
);

export const DarkAndLight = () => (
  <BothModes>
    <div style={{ display: 'flex', gap: 8 }}>
      <ConfidenceChip confidence="high" />
      <ConfidenceChip confidence="medium" />
      <ConfidenceChip confidence="low" />
    </div>
  </BothModes>
);
