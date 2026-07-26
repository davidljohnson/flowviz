import { SegmentedControl } from 'flowviz';
import { Surface, BothModes } from '../preview-lib/theme';

const INPUT_MODE = [
  { value: 'url', label: 'URL' },
  { value: 'text', label: 'Paste text' },
] as const;

const NODE_TYPE = [
  { value: 'action', label: 'Technique' },
  { value: 'tool', label: 'Tool' },
  { value: 'malware', label: 'Malware' },
  { value: 'asset', label: 'Asset' },
] as const;

/** `md` — the hero input-mode switch. */
export const Medium = () => (
  <Surface>
    <SegmentedControl options={INPUT_MODE} value="url" onChange={() => {}} size="md" aria-label="Input mode" />
  </Surface>
);

/** `sm` — inspector fields. */
export const Small = () => (
  <Surface>
    <SegmentedControl options={NODE_TYPE} value="tool" onChange={() => {}} size="sm" aria-label="Node type" />
  </Surface>
);

/** Stretched to fill an inspector row. */
export const FullWidth = () => (
  <Surface width={360}>
    <SegmentedControl options={INPUT_MODE} value="text" onChange={() => {}} fullWidth aria-label="Input mode" />
  </Surface>
);

/** Nothing selected — the state an optional field starts in. */
export const NoSelection = () => (
  <Surface>
    <SegmentedControl options={NODE_TYPE} value="" onChange={() => {}} aria-label="Node type" />
  </Surface>
);

export const DarkAndLight = () => (
  <BothModes>
    <SegmentedControl options={NODE_TYPE} value="tool" onChange={() => {}} aria-label="Node type" />
  </BothModes>
);
