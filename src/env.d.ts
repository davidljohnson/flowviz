/// <reference types="vite/client" />

// REMOVED: VITE_ANTHROPIC_API_KEY no longer used - all API calls are server-side only
interface ImportMetaEnv {
  // No client-side API keys - all authentication handled server-side

  /**
   * Origin of the backend, e.g. https://api.example.com. Unset when the app
   * and its server share an origin, where relative paths are right.
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 