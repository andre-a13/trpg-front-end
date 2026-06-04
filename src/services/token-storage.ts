import type { AuthUser, TokenPairResponse } from "../types/api";

export type { AuthUser, TokenPairResponse };

export type StoredTokens = {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  refreshExpiresAt: number;
};

let storedTokens: StoredTokens | null = null;

export function toStoredTokens(response: TokenPairResponse): StoredTokens {
  const now = Date.now();

  return {
    accessToken: response.access_token,
    tokenType: response.token_type,
    expiresAt: now + response.expires_in * 1000,
    refreshExpiresAt: now + response.refresh_expires_in * 1000,
  };
}

export function getStoredTokens() {
  return storedTokens;
}

export function setStoredTokens(tokens: StoredTokens) {
  storedTokens = tokens;
}

export function clearStoredTokens() {
  storedTokens = null;
}
