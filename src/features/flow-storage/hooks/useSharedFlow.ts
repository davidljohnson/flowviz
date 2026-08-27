import { useEffect, useState } from 'react';
import { SavedFlow } from '../types/SavedFlow';
import { flowStorage } from '../services';

/**
 * Opens a flow named in the URL, so `/f/<id>` is a link to a specific analysis
 * rather than just to the app.
 *
 * Deliberately not a router. The app has exactly one route that means anything
 * — a flow — and reading one path segment on boot costs a few lines, where a
 * routing library would add a dependency and a layer for a single case.
 *
 * Both deployments get something from it. Self-hosting resolves the segment as
 * a local flow id, which makes saved analyses linkable and bookmarkable on a
 * shared instance. A backend with accounts resolves it as a share token, which
 * is how a link from somewhere else lands on the right graph.
 */

export type SharedFlowMode = 'view' | 'edit';

interface SharedFlowState {
  flow: SavedFlow | null;
  mode: SharedFlowMode;
  /** Whether this flow arrived by link rather than from the local library. */
  isShared: boolean;
  isLoading: boolean;
  error: string | null;
}

const IDLE: SharedFlowState = {
  flow: null,
  mode: 'edit',
  isShared: false,
  isLoading: false,
  error: null,
};

/** The `<token>` in `/f/<token>`, or null when the app was opened normally. */
export const readFlowToken = (pathname = window.location.pathname): string | null => {
  const match = pathname.match(/^\/f\/([A-Za-z0-9_-]+)\/?$/);
  return match ? match[1] : null;
};

export const useSharedFlow = (): SharedFlowState => {
  const [state, setState] = useState<SharedFlowState>(() =>
    readFlowToken() ? { ...IDLE, isLoading: true } : IDLE
  );

  useEffect(() => {
    const token = readFlowToken();
    if (!token) return;

    let active = true;

    const resolve = async (): Promise<SharedFlowState> => {
      // Flows live in this browser, so the segment is a local flow id rather
      // than a share token: a link can only ever mean one of your own analyses.
      // Sharing one means exporting it.
      try {
        const flow = await flowStorage.loadFlow(token);
        return { flow, mode: 'edit', isShared: false, isLoading: false, error: null };
      } catch {
        return { ...IDLE, error: 'That analysis is not on this device.' };
      }
    };

    void resolve()
      .then((next) => {
        if (active) setState(next);
      })
      .catch(() => {
        if (active) setState({ ...IDLE, error: 'Could not open that link.' });
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
};
