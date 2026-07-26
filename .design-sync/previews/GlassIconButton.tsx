import { GlassIconButton, CompactIconButton } from 'flowviz';
import { Surface, BothModes } from '../preview-lib/theme';

const Icon = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d={d} />
  </svg>
);

const ZOOM_IN = 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.49 4.49 0 0 1 9.5 14M12 10h-2v2H9v-2H7V9h2V7h1v2h2z';
const DOWNLOAD = 'M5 20h14v-2H5zM19 9h-4V3H9v6H5l7 7z';
// "Tune" sliders — a settings glyph that reads at 18px without a gear's detail.
const SETTINGS =
  'M3 17v2h6v-2H3M3 5v2h10V5H3m10 16v-2h8v-2h-8v-2h-2v6h2M7 9v2H3v2h4v2h2V9H7m14 4v-2H11v2h10m-6-4h2V7h4V5h-4V3h-2v6z';

/** The app-bar / canvas-control button: a glass disc holding a single glyph. */
export const Default = () => (
  <Surface>
    <GlassIconButton aria-label="Zoom to fit">
      <Icon d={ZOOM_IN} />
    </GlassIconButton>
  </Surface>
);

/** How they actually appear — a row of canvas controls. */
export const AsAToolbar = () => (
  <Surface>
    <div style={{ display: 'flex', gap: 8 }}>
      <GlassIconButton aria-label="Zoom to fit">
        <Icon d={ZOOM_IN} />
      </GlassIconButton>
      <GlassIconButton aria-label="Export">
        <Icon d={DOWNLOAD} />
      </GlassIconButton>
      <GlassIconButton aria-label="Settings">
        <Icon d={SETTINGS} />
      </GlassIconButton>
    </div>
  </Surface>
);

export const Disabled = () => (
  <Surface>
    <GlassIconButton disabled aria-label="Export">
      <Icon d={DOWNLOAD} />
    </GlassIconButton>
  </Surface>
);

/** `CompactIconButton` is the same disc at inspector-header size. */
export const CompactVariant = () => (
  <BothModes>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <GlassIconButton aria-label="Settings">
        <Icon d={SETTINGS} />
      </GlassIconButton>
      <CompactIconButton aria-label="Settings">
        <Icon d={SETTINGS} />
      </CompactIconButton>
    </div>
  </BothModes>
);
