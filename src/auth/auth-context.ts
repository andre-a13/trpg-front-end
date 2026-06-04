import { createContext } from "react";
import type { AccountCredentials } from "../services/auth.service";
import type { AuthUser } from "../services/token-storage";

export type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (credentials: AccountCredentials) => Promise<AuthUser>;
  register: (credentials: AccountCredentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export type { AccountCredentials, AuthUser };

