import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setAuthTokenProvider } from '../../shared/services/api/apiClient';
import {
  AuthUser,
  getAccessToken,
  getCurrentUser,
  isAuthConfigured,
  onAuthStateChange,
} from './services/authClient';

interface AuthContextValue {
  /** Whether this instance has accounts at all. False when self-hosting. */
  enabled: boolean;
  user: AuthUser | null;
  /** True until the initial session lookup settles. Always false when disabled. */
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  enabled: false,
  user: null,
  isLoading: false,
});

export const useAuth = (): AuthContextValue => useContext(AuthContext);

/**
 * Connects the auth client to the rest of the app.
 *
 * Two jobs: hand apiClient a way to get the current token, and track the
 * signed-in user so the UI can show an account menu. When accounts are not
 * configured it does neither, renders its children, and costs one boolean.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const enabled = isAuthConfigured();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const queryClient = useQueryClient();

  // Registered in an effect rather than at module scope so a build without
  // accounts leaves apiClient with no provider and sends bare requests.
  useEffect(() => {
    if (!enabled) return;

    setAuthTokenProvider(getAccessToken);
    return () => setAuthTokenProvider(null);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    void getCurrentUser().then((current) => {
      if (!active) return;
      setUser(current);
      setIsLoading(false);
    });

    const unsubscribe = onAuthStateChange((next) => {
      if (!active) return;
      setUser(next);
      setIsLoading(false);

      // Entitlements and the flow library both belong to whoever is signed in,
      // so anything cached for the previous identity is now wrong.
      void queryClient.invalidateQueries();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [enabled, queryClient]);

  const value = useMemo(
    () => ({ enabled, user, isLoading }),
    [enabled, user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
