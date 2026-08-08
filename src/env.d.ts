/// <reference types="vite/client" />

// REMOVED: VITE_ANTHROPIC_API_KEY no longer used - all API calls are server-side only
interface ImportMetaEnv {
  // No client-side API keys - all authentication handled server-side

  /**
   * Origin of the backend, e.g. https://api.flowviz.io. Unset for self-hosting,
   * where the app and its server share an origin and relative paths are right.
   */
  readonly VITE_API_BASE_URL?: string;

  /**
   * Supabase project credentials. Both unset for self-hosting, which disables
   * the account UI entirely and leaves every request unauthenticated. The anon
   * key is public by design — it grants nothing on its own, because RLS denies
   * the anon role and only the backend's service role reaches the data.
   */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 