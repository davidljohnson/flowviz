import { createContext, useContext } from 'react';

export interface EdgeActionsContextValue {
  /**
   * Open the edge-label editor for `edgeId`, seeded with `currentLabel` and
   * anchored at the given screen coordinates. Lets a custom edge (rendered deep
   * inside ReactFlow) trigger the container's label popover without threading a
   * callback through edge data (which would pollute saved flows).
   */
  onEditLabel: (edgeId: string, currentLabel: string, anchor: { x: number; y: number }) => void;
}

const EdgeActionsContext = createContext<EdgeActionsContextValue | null>(null);

export const EdgeActionsProvider = EdgeActionsContext.Provider;

/** Edge-side hook. Returns null outside a provider (edges still render fine). */
export function useEdgeActions(): EdgeActionsContextValue | null {
  return useContext(EdgeActionsContext);
}
