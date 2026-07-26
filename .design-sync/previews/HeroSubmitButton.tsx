import { HeroSubmitButton } from 'flowviz';
import { Surface } from '../preview-lib/theme';

/** The primary call to action on the landing search form. */
export const Default = () => (
  <Surface>
    <HeroSubmitButton>Analyze</HeroSubmitButton>
  </Surface>
);

/** `isLoading` also disables the button — the sweep animation runs across it. */
export const Loading = () => (
  <Surface>
    <HeroSubmitButton isLoading>Analyzing…</HeroSubmitButton>
  </Surface>
);

export const Disabled = () => (
  <Surface>
    <HeroSubmitButton disabled>Analyze</HeroSubmitButton>
  </Surface>
);
