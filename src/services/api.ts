import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { createClient } from "../api/generated/client";
import { authRefresh } from "../api/generated/sdk.gen";
import {
  clearStoredTokens,
  getStoredTokens,
  setStoredTokens,
  toStoredTokens,
  type StoredTokens,
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

export const apiClient = createClient({ axios: api, baseURL: apiBaseUrl, withCredentials: true });
export const publicClient = createClient({ axios: publicApi, baseURL: apiBaseUrl, withCredentials: true });
export const apiOptions = { client: apiClient, throwOnError: true } as const;
export const publicApiOptions = { client: publicClient, throwOnError: true } as const;

let refreshPromise: Promise<StoredTokens> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export async function refreshTokens() {
  if (!refreshPromise) {
    refreshPromise = authRefresh(publicApiOptions)
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
      const stored = getStoredTokens();
      // Another concurrent request may have refreshed while this 401 was in flight.
      const tokens = stored?.accessToken && originalRequest.headers.Authorization !== `Bearer ${stored.accessToken}`
        ? stored
        : await refreshTokens();
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
