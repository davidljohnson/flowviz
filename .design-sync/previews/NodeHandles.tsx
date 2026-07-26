import { NodeHandles } from 'flowviz';
import { Surface } from '../preview-lib/theme';

/**
 * The four connection dots are `opacity: 0` at rest — the canvas fades them in
 * on node hover so they don't clutter a flow. Rendered honestly they are
 * invisible, so `Revealed` forces the same visible state the canvas applies.
 *
 * The handles must be a *direct* child of the positioned node box: ReactFlow
 * places each one against its offset parent, so an intermediate wrapper
 * collapses all four onto one edge.
 */
const Node = ({ reveal }: { reveal: boolean }) => (
  <div
    className={reveal ? 'fv-reveal-handles' : undefined}
    style={{
      position: 'relative',
      width: 180,
      height: 72,
      borderRadius: 10,
      background: 'var(--fv-node-surface)',
      border: '1px solid var(--fv-node-border)',
      display: 'grid',
      placeItems: 'center',
      color: 'var(--fv-text-secondary)',
      font: '600 12px Inter, sans-serif',
    }}
  >
    <span>Node body</span>
    <NodeHandles />
  </div>
);

export const Revealed = () => (
  <Surface pad={28}>
    <style>{'.fv-reveal-handles .react-flow__handle{opacity:1 !important}'}</style>
    <Node reveal />
  </Surface>
);

/** At rest — deliberately invisible, which is the component's whole point. */
export const AtRest = () => (
  <Surface pad={28}>
    <Node reveal={false} />
  </Surface>
);
