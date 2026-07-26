import { StreamingProgressBar } from 'flowviz';
import { Surface } from '../preview-lib/theme';

/**
 * The bar is `position: absolute` and pins to the top edge of its nearest
 * positioned ancestor, so every cell gives it a panel to sit in — rendered bare
 * it would fly to the corner of the page.
 */
const Panel = ({ children }: { children?: React.ReactNode }) => (
  <div
    style={{
      position: 'relative',
      height: 96,
      borderRadius: 12,
      border: '1px solid var(--fv-surface-border-default)',
      background: 'var(--fv-background-secondary)',
      overflow: 'hidden',
      padding: 16,
      color: 'var(--fv-text-secondary)',
      font: '500 13px Inter, sans-serif',
    }}
  >
    {children}
  </div>
);

export const Streaming = () => (
  <Surface width={420}>
    <Panel>
      <StreamingProgressBar isVisible />
      Extracting attack flow…
    </Panel>
  </Surface>
);

/** `isVisible={false}` renders nothing at all — the panel is simply quiet. */
export const Hidden = () => (
  <Surface width={420}>
    <Panel>
      <StreamingProgressBar isVisible={false} />
      Analysis complete — 14 nodes
    </Panel>
  </Surface>
);
