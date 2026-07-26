import { LoadingAlert } from 'flowviz';
import { Surface, BothModes } from '../preview-lib/theme';

export const Default = () => (
  <Surface width={360}>
    <LoadingAlert />
  </Surface>
);

export const WithMessage = () => (
  <Surface width={360}>
    <LoadingAlert message="Fetching article…" />
  </Surface>
);

/** The stages the analysis actually reports, stacked. */
export const AnalysisStages = () => (
  <Surface width={360}>
    <div style={{ display: 'grid', gap: 10 }}>
      <LoadingAlert message="Fetching article…" />
      <LoadingAlert message="Reading diagrams…" />
      <LoadingAlert message="Extracting attack flow…" />
    </div>
  </Surface>
);

export const DarkAndLight = () => (
  <BothModes width={340}>
    <LoadingAlert message="Extracting attack flow…" />
  </BothModes>
);
