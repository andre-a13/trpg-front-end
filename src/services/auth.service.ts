import api, { publicApi, refreshTokens } from "./api";
import type { AuthUser, TokenPairResponse } from "./token-storage";

export type AccountCredentials = {
  username: string;
  password: string;
};

async function login(credentials: AccountCredentials) {
  const response = await publicApi.post<TokenPairResponse>("/auth/login", credentials);
  return response.data;
}

async function register(credentials: AccountCredentials) {
  const response = await api.post<AuthUser>("/auth/register", credentials);
  return response.data;
}

async function logout() {
  await publicApi.post("/auth/logout");
}

async function me() {
  const response = await api.get<AuthUser>("/auth/me");
  return response.data;
}

export default {
  login,
  logout,
  me,
  refresh: refreshTokens,
  register,
};
