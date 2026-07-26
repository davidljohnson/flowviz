import { GlassMorphButton } from 'flowviz';
import { Surface } from '../preview-lib/theme';

export const Default = () => (
  <Surface>
    <GlassMorphButton>Analyze article</GlassMorphButton>
  </Surface>
);

export const WithIcon = () => (
  <Surface>
    <GlassMorphButton
      startIcon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Z" />
        </svg>
      }
    >
      Run threat analysis
    </GlassMorphButton>
  </Surface>
);

export const Disabled = () => (
  <Surface>
    <GlassMorphButton disabled>Export STIX bundle</GlassMorphButton>
  </Surface>
);

export const InARow = () => (
  <Surface>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <GlassMorphButton>Save flow</GlassMorphButton>
      <GlassMorphButton>Export</GlassMorphButton>
      <GlassMorphButton disabled>Publish</GlassMorphButton>
    </div>
  </Surface>
);
