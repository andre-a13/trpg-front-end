import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from "axios";
import api, { publicApi, setUnauthorizedHandler } from "../../src/services/api";
import inventions from "../../src/services/invention.service";
import { clearStoredTokens, getStoredTokens, setStoredTokens } from "../../src/services/token-storage";

const initialAdapter = api.defaults.adapter;
const initialPublicAdapter = publicApi.defaults.adapter;
const item = { id: 42, name: "Clockwork", description: "A test invention" };
const state = { enabled: true, drawCount: 5, permissions: { canDraw: true }, items: [item] };

function response(config: InternalAxiosRequestConfig, data: unknown, status = 200) {
  return { config, data, status, statusText: String(status), headers: new AxiosHeaders() };
}

function reject(config: InternalAxiosRequestConfig, status: number): never {
  throw new AxiosError("API error", "ERR_BAD_RESPONSE", config, undefined,
    response(config, { detail: "API error" }, status));
}

beforeEach(() => {
  setStoredTokens({ accessToken: "expired", tokenType: "bearer", expiresAt: 0, refreshExpiresAt: 99999 });
});

afterEach(() => {
  api.defaults.adapter = initialAdapter;
  publicApi.defaults.adapter = initialPublicAdapter;
  clearStoredTokens();
  setUnauthorizedHandler(null);
});

describe("generated inventions client", () => {
  it("preserves the six service results, methods, bodies and transport options", async () => {
    const requests: InternalAxiosRequestConfig[] = [];
    api.defaults.adapter = async config => {
      requests.push(config);
      if (config.method === "delete") return response(config, "", 204);
      const data = config.method === "patch" ? { enabled: true }
        : config.url?.endsWith("/inventions") && config.method === "get" && requests.length === 1 ? [item]
        : config.method === "post" && config.url?.endsWith("/inventions") ? item : state;
      return response(config, data);
    };
    expect(await inventions.list()).toEqual([item]);
    expect(await inventions.add(item.name)).toEqual(item);
    expect(await inventions.remove(item.id)).toBeUndefined();
    expect(await inventions.setEnabled("hero", true)).toEqual({ enabled: true });
    expect(await inventions.getState("hero")).toEqual(state);
    expect(await inventions.draw("hero")).toEqual(state);
    expect(requests.map(request => request.method)).toEqual(["get", "post", "delete", "patch", "get", "post"]);
    expect(requests.map(request => new URL(request.url!).pathname)).toEqual([
      "/inventions", "/inventions", "/inventions/42", "/characters/hero/invengineer",
      "/characters/hero/inventions", "/characters/hero/inventions/draw",
    ]);
    expect(JSON.parse(requests[1].data)).toEqual({ name: item.name });
    expect(JSON.parse(requests[3].data)).toEqual({ enabled: true });
    for (const request of requests) {
      expect(request.withCredentials).toBe(true);
      expect(request.headers.Authorization).toBe("Bearer expired");
      expect(request.headers["ngrok-skip-browser-warning"]).toBe("true");
    }
  });

  it("shares one refresh between simultaneous 401s and replays each request once", async () => {
    let protectedCalls = 0;
    const refresh = vi.fn(async (config: InternalAxiosRequestConfig) => {
      expect(config.headers.Authorization).toBeUndefined();
      expect(config.withCredentials).toBe(true);
      await new Promise(resolve => setTimeout(resolve, 5));
      return response(config, { access_token: "fresh", token_type: "bearer", expires_in: 3600, refresh_expires_in: 86400 });
    });
    publicApi.defaults.adapter = refresh;
    api.defaults.adapter = async config => {
      protectedCalls++;
      if (config.headers.Authorization !== "Bearer fresh") reject(config, 401);
      return response(config, state);
    };
    expect(await Promise.all([inventions.getState("a"), inventions.getState("b")])).toEqual([state, state]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(protectedCalls).toBe(4);
    expect(getStoredTokens()?.accessToken).toBe("fresh");
  });

  it("clears the session when refresh fails", async () => {
    const unauthorized = vi.fn();
    setUnauthorizedHandler(unauthorized);
    api.defaults.adapter = async config => reject(config, 401);
    const refresh = vi.fn(async (config: InternalAxiosRequestConfig) => reject(config, 401));
    publicApi.defaults.adapter = refresh;
    await expect(inventions.getState("hero")).rejects.toMatchObject({ response: { status: 401 } });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(unauthorized).toHaveBeenCalledTimes(1);
    expect(getStoredTokens()).toBeNull();
  });

  it("reuses the refreshed token when an older concurrent request returns a delayed 401", async () => {
    let release!: () => void;
    const delayed = new Promise<void>(resolve => { release = resolve; });
    const refresh = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, {
      access_token: "fresh", token_type: "bearer", expires_in: 3600, refresh_expires_in: 86400,
    }));
    publicApi.defaults.adapter = refresh;
    api.defaults.adapter = async config => {
      if (config.headers.Authorization === "Bearer fresh") return response(config, state);
      if (config.url?.includes("/slow/")) await delayed;
      return reject(config, 401);
    };
    const slow = inventions.getState("slow");
    await inventions.getState("fast");
    expect(refresh).toHaveBeenCalledTimes(1);
    release();
    await slow;
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not recursively refresh a replayed request", async () => {
    const protectedRequest = vi.fn(async (config: InternalAxiosRequestConfig) => reject(config, 401));
    api.defaults.adapter = protectedRequest;
    const refresh = vi.fn(async (config: InternalAxiosRequestConfig) => response(config, {
      access_token: "fresh", token_type: "bearer", expires_in: 3600, refresh_expires_in: 86400,
    }));
    publicApi.defaults.adapter = refresh;
    await expect(inventions.getState("hero")).rejects.toMatchObject({ response: { status: 401 } });
    expect(protectedRequest).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("propagates application errors without refreshing or repeating a draw", async () => {
    const request = vi.fn(async (config: InternalAxiosRequestConfig) => reject(config, 409));
    const refresh = vi.fn();
    api.defaults.adapter = request;
    publicApi.defaults.adapter = refresh;
    await expect(inventions.draw("hero")).rejects.toMatchObject({ response: { status: 409 } });
    expect(request).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });
});
