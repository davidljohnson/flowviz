import { TypeToken } from 'flowviz';
import { Surface, BothModes } from '../preview-lib/theme';

const TYPES = ['action', 'tool', 'malware', 'asset', 'infrastructure', 'url', 'vulnerability'];

/**
 * The token is the card's and the inspector's shared moment of colour, so the
 * card sweeps every type at once — the palette is the point.
 */
export const EveryType = () => (
  <Surface>
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      {TYPES.map((t) => (
        <TypeToken key={t} nodeType={t} size={28} />
      ))}
    </div>
  </Surface>
);

/** Card size (24) beside the inspector's prominent size (36). */
export const Sizes = () => (
  <Surface>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <TypeToken nodeType="malware" size={20} />
      <TypeToken nodeType="malware" size={24} />
      <TypeToken nodeType="malware" size={28} />
      <TypeToken nodeType="malware" size={36} />
    </div>
  </Surface>
);

/** On light the tint flattens and the glyph deepens to hold contrast. */
export const DarkAndLight = () => (
  <BothModes>
    <div style={{ display: 'flex', gap: 10 }}>
      {TYPES.map((t) => (
        <TypeToken key={t} nodeType={t} size={28} />
      ))}
    </div>
  </BothModes>
);
