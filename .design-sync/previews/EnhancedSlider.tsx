import { EnhancedSlider, FormSection, FormSectionTitle } from 'flowviz';
import { Surface, BothModes } from '../preview-lib/theme';

export const Default = () => (
  <Surface width={360}>
    <EnhancedSlider defaultValue={5} min={1} max={10} />
  </Surface>
);

/** The story-mode speed control it was built for — marks and a value label. */
export const StorySpeed = () => (
  <Surface width={380}>
    <FormSection>
      <FormSectionTitle>Story speed (seconds per step)</FormSectionTitle>
      {/* The always-on value label sits above the thumb and would otherwise
          collide with the section title. */}
      <div style={{ paddingTop: 22 }}>
        <EnhancedSlider defaultValue={3} min={1} max={10} step={1} marks valueLabelDisplay="on" />
      </div>
    </FormSection>
  </Surface>
);

export const Disabled = () => (
  <Surface width={360}>
    <EnhancedSlider defaultValue={5} min={1} max={10} disabled />
  </Surface>
);

export const DarkAndLight = () => (
  <BothModes width={340}>
    <EnhancedSlider defaultValue={7} min={1} max={10} step={1} marks />
  </BothModes>
);
