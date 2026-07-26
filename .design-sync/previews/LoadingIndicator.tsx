import { LoadingIndicator } from 'flowviz';
import { Surface } from '../preview-lib/theme';

/**
 * The indicator cycles its own states on a timer. A card is a still frame, so
 * these cells document the two content types it ships with rather than the
 * animation — `intervalDuration` is set high so the capture lands on step one.
 */
export const ForAUrl = () => (
  <Surface width={460}>
    <LoadingIndicator isVisible contentType="url" intervalDuration={100000} />
  </Surface>
);

export const ForPastedText = () => (
  <Surface width={460}>
    <LoadingIndicator isVisible contentType="text" intervalDuration={100000} />
  </Surface>
);

/** `isVisible={false}` renders nothing. */
export const Hidden = () => (
  <Surface width={460}>
    <LoadingIndicator isVisible={false} contentType="url" />
  </Surface>
);
