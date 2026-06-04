import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import authService, { type AccountCredentials } from "../services/auth.service";
import { setUnauthorizedHandler } from "../services/api";
import {
  clearStoredTokens,
  getStoredTokens,
  setStoredTokens,
  toStoredTokens,
  type AuthUser,
} from "../services/token-storage";
import { AuthContext, type AuthContextValue } from "./auth-context";

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const clearSession = useCallback(() => {
    clearStoredTokens();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        if (!getStoredTokens()) {
          await authService.refresh();
        }
        const currentUser = await authService.me();
        if (isMounted) setUser(currentUser);
      } catch {
        clearStoredTokens();
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (credentials: AccountCredentials) => {
    const tokenResponse = await authService.login(credentials);
    setStoredTokens(toStoredTokens(tokenResponse));

    const currentUser = await authService.me();
    setUser(currentUser);
    return currentUser;
  }, []);

  const register = useCallback(async (credentials: AccountCredentials) => {
    const newUser = await authService.register(credentials);

    if (!getStoredTokens()) {
      const tokenResponse = await authService.login(credentials);
      setStoredTokens(toStoredTokens(tokenResponse));
      setUser(newUser);
    }

    return newUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      login,
      logout,
      register,
    }),
    [isInitializing, login, logout, register, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
