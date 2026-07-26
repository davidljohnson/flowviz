import { SearchInputWithClear } from 'flowviz';
import { Surface } from '../preview-lib/theme';

/** The clear button only appears once there is a value AND an onClear handler. */
export const WithValue = () => (
  <Surface width={420}>
    <SearchInputWithClear fullWidth value="T1566" onClear={() => {}} />
  </Surface>
);

export const Empty = () => (
  <Surface width={420}>
    <SearchInputWithClear fullWidth value="" onClear={() => {}} placeholder="Search techniques…" />
  </Surface>
);

/** Without the leading search icon — for rows that already carry a label. */
export const NoSearchIcon = () => (
  <Surface width={420}>
    <SearchInputWithClear fullWidth value="lateral movement" showSearchIcon={false} onClear={() => {}} />
  </Surface>
);
