import { createContext, useContext, type ReactNode } from 'react';
import { useStore } from 'reactflow';
import { tierForScale, type DetailTier } from './nodeStyles';

/**
 * The scale a node will actually be *presented* at.
 *
 * Normally that is the live viewport zoom, and this context is null. It is set
 * only while the canvas is being captured, because during a capture the two
 * come apart:
 *
 *   PNG export renders the image at its own scale (~2x, applied by
 *   html-to-image to a clone), but it first calls `fitView` on the real
 *   viewport to defeat `onlyRenderVisibleElements` and force every node into
 *   the DOM. So at the moment of capture the live zoom is whatever it takes to
 *   fit the whole flow on screen — small, and smaller the bigger the flow.
 *
 * Keyed off the live zoom, a big flow would therefore render every node as a
 * label-less colour token and export a crisp 2x PNG of coloured rectangles,
 * while small flows exported fine. That failure scales with flow size, which is
 * the worst way for it to fail: it passes every casual test and breaks on
 * exactly the diagrams worth exporting.
 *
 * Keying off presentation scale instead makes one rule true in both contexts —
 * *a node draws the detail appropriate to the size it will be seen at* — and
 * removes the special case rather than adding one.
 */
const PresentationScaleContext = createContext<number | null>(null);

export function PresentationScaleProvider({
  scale,
  children,
}: {
  /** null to follow the live viewport; a number to pin detail for a capture. */
  scale: number | null;
  children: ReactNode;
}) {
  return (
    <PresentationScaleContext.Provider value={scale}>
      {children}
    </PresentationScaleContext.Provider>
  );
}

/**
 * The detail tier this node should draw at, and whether it is pinned.
 *
 * The `useStore` selector returns the tier, not the raw zoom, so a node
 * re-renders when it crosses a threshold rather than on every wheel event.
 *
 * `pinned` exists because tier changes are animated, and a capture must not be.
 * html-to-image clones the DOM two frames after the tier is pinned, and the
 * cross-fades between tiers run for 180ms — so the clone caught the cards
 * mid-flight: labels still near opacity 0, borders still at token strength,
 * tint already half gone. The exported PNG came out as empty outlined boxes.
 * Callers use this to drop their transitions, which makes the pinned state
 * land on the very first frame instead of a tenth of a second later.
 */
export function useDetailState(): { tier: DetailTier; pinned: boolean } {
  const override = useContext(PresentationScaleContext);
  const liveTier = useStore((s) => tierForScale(s.transform[2]));
  return override === null
    ? { tier: liveTier, pinned: false }
    : { tier: tierForScale(override), pinned: true };
}
