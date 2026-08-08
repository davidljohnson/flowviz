/**
 * Single entry point for every call the app makes to its backend.
 *
 * The app ships against two different backends: the self-host server in this
 * repo, and the hosted service. They implement the same routes, so the only
 * things that vary are where the backend lives and whether requests carry a
 * credential. Both are settled here, once, rather than at each call site.
 *
 * VITE_API_BASE_URL unset — the default, and what self-hosting uses — leaves
 * paths relative, so requests go to the origin serving the app and the dev
 * proxy in vite.config.ts keeps working untouched.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

/**
 * Returns a bearer token for the current session, or null when the request
 * should go out unauthenticated.
 *
 * Auth is registered rather than imported so this module — and every call site
 * through it — stays unaware of which auth library is in play, or whether
 * there is one at all. A self-host build never registers a provider and every
 * request goes out bare.
 */
export type AuthTokenProvider = () => Promise<string | null>;

let authTokenProvider: AuthTokenProvider | null = null;

export const setAuthTokenProvider = (provider: AuthTokenProvider | null): void => {
  authTokenProvider = provider;
};

/** Absolute URL for a backend path. Exported for callers that need the URL itself. */
export const apiUrl = (path: string): string =>
  `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/**
 * fetch() against the backend, with the session credential attached when there
 * is one. Identical to fetch() in every other respect — callers keep full
 * control of method, body, and streaming, which matters because several of
 * these endpoints return SSE and must not be buffered.
 */
export const apiFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const token = authTokenProvider ? await authTokenProvider() : null;

  // Headers is used rather than a spread so a caller passing Headers or an
  // array of pairs works the same as one passing a plain object.
  const headers = new Headers(init.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(apiUrl(path), { ...init, headers });
};
