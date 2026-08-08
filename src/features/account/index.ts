export { AuthProvider, useAuth } from './AuthProvider';
export {
  isAuthConfigured,
  getAccessToken,
  getCurrentUser,
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle,
  sendPasswordReset,
  signOut,
  onAuthStateChange,
} from './services/authClient';
export type { AuthUser } from './services/authClient';
