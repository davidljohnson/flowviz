/**
 * Single entry point for every call the app makes to its backend.
 *
 * Where the backend lives is settled here, once, rather than at each call
 * site.
 *
 * VITE_API_BASE_URL unset — the default, and what self-hosting uses — leaves
 * paths relative, so requests go to the origin serving the app and the dev
 * proxy in vite.config.ts keeps working untouched.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

/** Absolute URL for a backend path. Exported for callers that need the URL itself. */
export const apiUrl = (path: string): string =>
  `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/**
 * fetch() against the backend. Identical to fetch() in every other respect —
 * callers keep full control of method, body, and streaming, which matters
 * because several of these endpoints return SSE and must not be buffered.
 *
 * Requests go out unauthenticated: this server has no accounts, and the API key
 * it spends belongs to whoever runs it. A deployment that puts identity in
 * front of this is adding a layer, not configuring one.
 */
export const apiFetch = (path: string, init: RequestInit = {}): Promise<Response> =>
  fetch(apiUrl(path), init);
