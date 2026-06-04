import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import {
  clearStoredTokens,
  getStoredTokens,
  setStoredTokens,
  toStoredTokens,
  type StoredTokens,
  type TokenPairResponse,
} from "./token-storage";

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _authRetry?: boolean;
};

export const apiBaseUrl = import.meta.env.VITE_TRPG_API_URL ?? "http://localhost:8000";

const defaultHeaders = {
  "ngrok-skip-browser-warning": "true",
};

export const publicApi = axios.create({
  baseURL: apiBaseUrl,
  headers: defaultHeaders,
  withCredentials: true,
});

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: defaultHeaders,
  withCredentials: true,
});

let refreshPromise: Promise<StoredTokens> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export async function refreshTokens() {
  if (!refreshPromise) {
    refreshPromise = publicApi
      .post<TokenPairResponse>("/auth/refresh")
      .then((response) => {
        const nextTokens = toStoredTokens(response.data);
        setStoredTokens(nextTokens);
        return nextTokens;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const tokens = getStoredTokens();

  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (status !== 401 || !originalRequest || originalRequest._authRetry) {
      return Promise.reject(error);
    }

    originalRequest._authRetry = true;

    try {
      const tokens = await refreshTokens();
      originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
      return api(originalRequest);
    } catch {
      clearStoredTokens();
      unauthorizedHandler?.();
      return Promise.reject(error);
    }
  }
);

export default api;
