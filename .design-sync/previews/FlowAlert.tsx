import { FlowAlert } from 'flowviz';
import { Surface, BothModes } from '../preview-lib/theme';

export const AllStatuses = () => (
  <Surface width={440}>
    <div style={{ display: 'grid', gap: 10 }}>
      <FlowAlert status="success" title="Flow saved">
        12 techniques and 14 relationships written to local storage.
      </FlowAlert>
      <FlowAlert status="info" title="Vision analysis ran">
        Three diagrams in the article were read for additional context.
      </FlowAlert>
      <FlowAlert status="warning" title="Partial extraction">
        The article was truncated at 10 MB; later sections were not analyzed.
      </FlowAlert>
      <FlowAlert status="error" title="Analysis failed">
        The provider returned 429. Try again, or switch model in Settings.
      </FlowAlert>
    </div>
  </Surface>
);

/** Title only — the compact form used for transient confirmations. */
export const TitleOnly = () => (
  <Surface width={440}>
    <FlowAlert status="success" title="STIX 2.1 bundle exported" />
  </Surface>
);

export const BodyOnly = () => (
  <Surface width={440}>
    <FlowAlert status="info">No MITRE technique IDs were found in this article.</FlowAlert>
  </Surface>
);

export const DarkAndLight = () => (
  <BothModes width={420}>
    <FlowAlert status="warning" title="Partial extraction">
      The article was truncated at 10 MB; later sections were not analyzed.
    </FlowAlert>
  </BothModes>
);
