import { AnimatedSubmitButton } from 'flowviz';
import { Surface } from '../preview-lib/theme';

/** The simpler pill-shaped submit — same role as HeroSubmitButton, less motion. */
export const Default = () => (
  <Surface>
    <AnimatedSubmitButton>Analyze</AnimatedSubmitButton>
  </Surface>
);

export const Loading = () => (
  <Surface>
    <AnimatedSubmitButton isLoading>Analyzing…</AnimatedSubmitButton>
  </Surface>
);

export const Disabled = () => (
  <Surface>
    <AnimatedSubmitButton disabled>Analyze</AnimatedSubmitButton>
  </Surface>
);
