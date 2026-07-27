import { SearchInput, SearchInputURL, SearchInputMultiline } from 'flowviz';
import { Surface, BothModes } from '../preview-lib/theme';

export const Default = () => (
  <Surface width={420}>
    <SearchInput fullWidth placeholder="Search techniques…" />
  </Surface>
);

export const WithValue = () => (
  <Surface width={420}>
    <SearchInput fullWidth defaultValue="credential dumping" />
  </Surface>
);

/** The three shapes in the family, so the scale is visible at once. */
export const TheFamily = () => (
  <Surface width={440}>
    <div style={{ display: 'grid', gap: 12 }}>
      <SearchInput fullWidth placeholder="Standard — search" />
      <SearchInputURL fullWidth placeholder="URL — https://example.com/report" />
      <SearchInputMultiline fullWidth multiline rows={3} placeholder="Multiline — paste article text" />
    </div>
  </Surface>
);

export const DarkAndLight = () => (
  <BothModes width={400}>
    <SearchInput fullWidth defaultValue="credential dumping" />
  </BothModes>
);
