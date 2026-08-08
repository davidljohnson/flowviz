/**
 * Optional account support.
 *
 * FlowViz runs happily with no accounts at all — that is the default, and what
 * self-hosting gets unless VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are
 * both set. Supply your own Supabase project and the same build gains sign-in,
 * which is what makes a shared self-hosted instance usable by a team.
 *
 * The Supabase SDK is imported dynamically so a build without those variables
 * never downloads it. Everything below resolves to a no-op in that case, and
 * the account UI does not mount.
 *
 * The anon key is public by design: it identifies the project and nothing more.
 * Row level security denies the anon role every table, so the key's only
 * capability is reaching the auth endpoints.
 */

// Type-only import. Erased at compile time, so it costs nothing at runtime and
// does not defeat the dynamic import below.
import type { SupabaseClient, Session } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Whether this build has an auth backend configured. */
export const isAuthConfigured = (): boolean =>
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export interface AuthUser {
  id: string;
  email?: string;
}

let clientPromise: Promise<SupabaseClient | null> | null = null;

/**
 * The Supabase client, created on first use.
 *
 * Memoized on the promise rather than the resolved value so concurrent callers
 * during startup share one import and one client — two clients would each
 * install a storage listener and race each other's token refresh.
 */
const getClient = (): Promise<SupabaseClient | null> => {
  if (!isAuthConfigured()) return Promise.resolve(null);

  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) =>
        createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        })
      )
      .catch((error) => {
        console.error('Failed to load auth client:', error);
        // Reset so a later attempt can retry rather than being stuck on a
        // failed chunk fetch from a bad network moment.
        clientPromise = null;
        return null;
      });
  }

  return clientPromise;
};

const toUser = (session: Session | null): AuthUser | null =>
  session?.user ? { id: session.user.id, email: session.user.email } : null;

/**
 * Current access token, or null when signed out or unconfigured.
 *
 * This is what apiClient registers as its token provider. Supabase refreshes
 * an expiring token as part of getSession(), so callers always receive one
 * that is good for the request they are about to make.
 */
export const getAccessToken = async (): Promise<string | null> => {
  const client = await getClient();
  if (!client) return null;

  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
};

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const client = await getClient();
  if (!client) return null;

  const { data } = await client.auth.getSession();
  return toUser(data.session);
};

export const signInWithPassword = async (email: string, password: string): Promise<void> => {
  const client = await getClient();
  if (!client) throw new Error('Accounts are not enabled on this instance');

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
};

export const signUpWithPassword = async (email: string, password: string): Promise<void> => {
  const client = await getClient();
  if (!client) throw new Error('Accounts are not enabled on this instance');

  const { error } = await client.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/` },
  });
  if (error) throw new Error(error.message);
};

export const signInWithGoogle = async (): Promise<void> => {
  const client = await getClient();
  if (!client) throw new Error('Accounts are not enabled on this instance');

  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/` },
  });
  if (error) throw new Error(error.message);
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  const client = await getClient();
  if (!client) throw new Error('Accounts are not enabled on this instance');

  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/`,
  });
  if (error) throw new Error(error.message);
};

export const signOut = async (): Promise<void> => {
  const client = await getClient();
  if (!client) return;

  await client.auth.signOut();
};

/**
 * Subscribes to sign-in and sign-out. Returns an unsubscribe function; on an
 * unconfigured build that function is all this does.
 */
export const onAuthStateChange = (
  callback: (user: AuthUser | null) => void
): (() => void) => {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  void getClient().then((client) => {
    if (!client || cancelled) return;

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      callback(toUser(session));
    });
    unsubscribe = () => data.subscription.unsubscribe();
  });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
};
