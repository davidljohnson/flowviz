import { useEffect, useRef, useState } from 'react';
import { ActionMenu, GlassIconButton } from 'flowviz';
import { Surface } from '../preview-lib/theme';

const Icon = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d={d} />
  </svg>
);

const MORE = 'M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4m0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4m0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4';
const COPY = 'M16 1H4a2 2 0 0 0-2 2v14h2V3h12zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m0 16H8V7h11z';
const EXPORT = 'M5 20h14v-2H5zM19 9h-4V3H9v6H5l7 7z';
const TRASH = 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z';

/**
 * The menu anchors to a real element, so each cell renders the trigger, waits
 * for it to mount, and then opens against it — anchoring to `null` would park
 * the popper in the page corner.
 */
const Anchored = ({ items }: { items: React.ComponentProps<typeof ActionMenu>['items'] }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  useEffect(() => setAnchor(ref.current), []);

  return (
    <div style={{ height: 200 }}>
      <div ref={ref} style={{ display: 'inline-block' }}>
        <GlassIconButton aria-label="More actions">
          <Icon d={MORE} />
        </GlassIconButton>
      </div>
      <ActionMenu anchorEl={anchor} open={Boolean(anchor)} onClose={() => {}} items={items} />
    </div>
  );
};

const noop = () => {};

export const NodeActions = () => (
  <Surface width={320}>
    <Anchored
      items={[
        { id: 'duplicate', text: 'Duplicate node', icon: <Icon d={COPY} />, onClick: noop },
        { id: 'export', text: 'Export subtree', icon: <Icon d={EXPORT} />, onClick: noop },
        { id: 'delete', text: 'Delete node', icon: <Icon d={TRASH} />, variant: 'danger', onClick: noop },
      ]}
    />
  </Surface>
);

export const WithoutADangerItem = () => (
  <Surface width={320}>
    <Anchored
      items={[
        { id: 'copy', text: 'Copy as STIX', icon: <Icon d={COPY} />, onClick: noop },
        { id: 'png', text: 'Export as PNG', icon: <Icon d={EXPORT} />, onClick: noop },
      ]}
    />
  </Surface>
);
