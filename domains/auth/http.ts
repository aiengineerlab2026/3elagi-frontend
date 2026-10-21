import { Platform } from "react-native";
import { API_BASE } from "@/constants/api";
import {
  demoScopedStorageKey,
  resolveInitialDemoSlot,
} from "@/domains/auth/demoSession";
import { logoutOnAuthFailure, isAuthHttpStatus } from "@/domains/auth/sessionFailure";

export const isWebPlatform = Platform.OS === "web";

const WEB_AUTH_MODE_KEY = "3elagi-web-auth-mode";
const REFRESH_LOCK_KEY = "3elagi-auth-refresh";
const REFRESH_LOCK_MS = 15_000;

export type WebAuthMode = "cookie" | "token";

let webAccessToken: string | null = null;

export function getWebAuthMode(): WebAuthMode {
  if (!isWebPlatform) return "cookie";
  try {
    const key = demoScopedStorageKey(WEB_AUTH_MODE_KEY);
    return sessionStorage.getItem(key) === "token" ? "token" : "cookie";
  } catch {
    return "token";
  }
}

export function setWebAuthMode(mode: WebAuthMode): void {
  if (!isWebPlatform) return;
  try {
    sessionStorage.setItem(demoScopedStorageKey(WEB_AUTH_MODE_KEY), mode);
  } catch {
    // sessionStorage may be unavailable
  }
}

/** Demo iframe panels must use bearer tokens — HttpOnly cookies are shared per origin. */
export function ensureDemoEmbedTokenAuthMode(): void {
  // Platform.OS — not isWebPlatform; this can run while http.ts is still initializing
  // (store ↔ sessionFailure ↔ http circular import during module load).
  if (Platform.OS !== "web") return;
  if (resolveInitialDemoSlot()) {
    setWebAuthMode("token");
  }
}

/** HttpOnly cookies (default web). Skipped when cross-site cookies are blocked (incognito). */
export function usesCookieAuth(): boolean {
  return isWebPlatform && getWebAuthMode() === "cookie";
}

/** Bearer tokens — native apps and web when cookies cannot be stored. */
export function usesBearerTokenAuth(): boolean {
  return !isWebPlatform || getWebAuthMode() === "token";
}

export function getWebAccessToken(): string | null {
  return webAccessToken;
}

export function setWebAccessToken(token: string | null) {
  webAccessToken = token?.trim() || null;
}

export function authClientHeaders(accessToken?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (usesCookieAuth()) return headers;
  headers["X-Auth-Client"] = "native";
  if (accessToken?.trim()) {
    headers.Authorization = `Bearer ${accessToken.trim()}`;
  }
  return headers;
}

export function withAuthRequestInit(
  accessToken?: string | null,
  init?: RequestInit,
): RequestInit {
  const baseHeaders = authClientHeaders(accessToken);
  const extra = init?.headers
    ? Object.fromEntries(new Headers(init.headers as HeadersInit).entries())
    : {};
  return {
    ...init,
    credentials: usesCookieAuth() ? "include" : "omit",
    headers: {
      ...baseHeaders,
      ...extra,
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tryAcquireRefreshLock(): boolean {
  if (typeof sessionStorage === "undefined") return true;
  const now = Date.now();
  try {
    const lockKey = demoScopedStorageKey(REFRESH_LOCK_KEY);
    const raw = sessionStorage.getItem(lockKey);
    if (raw) {
      const started = Number(raw);
      if (Number.isFinite(started) && now - started < REFRESH_LOCK_MS) {
        return false;
      }
    }
    sessionStorage.setItem(lockKey, String(now));
    return true;
  } catch {
    return true;
  }
}

function releaseRefreshLock(): void {
  try {
    sessionStorage?.removeItem(demoScopedStorageKey(REFRESH_LOCK_KEY));
  } catch {
    // ignore private mode / storage errors
  }
}

async function waitForPeerRefresh(): Promise<void> {
  if (typeof sessionStorage === "undefined") return;
  const deadline = Date.now() + REFRESH_LOCK_MS;
  while (Date.now() < deadline) {
    try {
      const raw = sessionStorage.getItem(demoScopedStorageKey(REFRESH_LOCK_KEY));
      if (!raw) return;
      const started = Number(raw);
      if (!Number.isFinite(started) || Date.now() - started >= REFRESH_LOCK_MS) {
        return;
      }
    } catch {
      return;
    }
    await sleep(150);
  }
}

async function requestAccessToken(): Promise<
  { ok: true; token: string } | { ok: false; status: number }
> {
  const res = await fetch(`${API_BASE}/auth/access-token`, {
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  const token =
    typeof data?.access_token === "string" ? data.access_token.trim() : null;
  if (!token) {
    return { ok: false, status: 401 };
  }
  return { ok: true, token };
}

export async function fetchWebAccessToken(options?: {
  logoutOnFailure?: boolean;
}): Promise<string | null> {
  if (!usesCookieAuth()) return null;

  const result = await requestAccessToken();
  if (result.ok) {
    setWebAccessToken(result.token);
    return result.token;
  }

  setWebAccessToken(null);
  if (options?.logoutOnFailure !== false && isAuthHttpStatus(result.status)) {
    logoutOnAuthFailure();
  }
  return null;
}

/** Read the cookie token; refresh the session once if it is missing or expired. */
export async function ensureWebAccessToken(options?: {
  logoutOnFailure?: boolean;
}): Promise<string | null> {
  if (!usesCookieAuth()) return null;

  let result = await requestAccessToken();
  if (result.ok) {
    setWebAccessToken(result.token);
    return result.token;
  }

  if (!isAuthHttpStatus(result.status)) {
    setWebAccessToken(null);
    return null;
  }

  try {
    await refreshAuthSession();
  } catch {
    setWebAccessToken(null);
    if (options?.logoutOnFailure !== false) {
      logoutOnAuthFailure();
    }
    return null;
  }

  result = await requestAccessToken();
  if (result.ok) {
    setWebAccessToken(result.token);
    return result.token;
  }

  setWebAccessToken(null);
  if (options?.logoutOnFailure !== false) {
    logoutOnAuthFailure();
  }
  return null;
}

export async function refreshAuthSession(refreshToken?: string | null) {
  if (usesCookieAuth() && !tryAcquireRefreshLock()) {
    await waitForPeerRefresh();
    const peer = await requestAccessToken();
    if (peer.ok) {
      setWebAccessToken(peer.token);
      return {
        accessToken: peer.token,
        refreshToken: null,
        raw: {} as Record<string, unknown>,
      };
    }
    if (!tryAcquireRefreshLock()) {
      throw new Error("Refresh failed");
    }
  }

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, withAuthRequestInit(null, {
      method: "POST",
      body: usesCookieAuth()
        ? undefined
        : JSON.stringify({ refresh_token: refreshToken ?? undefined }),
    }));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (Array.isArray(data?.message) ? data.message.join(", ") : data?.message) ??
          data?.error ??
          `Refresh failed (${res.status})`,
      );
    }
    const access =
      typeof data?.access_token === "string" ? data.access_token.trim() : null;
    const nextRefresh =
      typeof data?.refresh_token === "string" ? data.refresh_token.trim() : refreshToken ?? null;
    if (access) {
      setWebAccessToken(access);
    }
    return {
      accessToken: access,
      refreshToken: nextRefresh,
      raw: data as Record<string, unknown>,
    };
  } finally {
    if (usesCookieAuth()) {
      releaseRefreshLock();
    }
  }
}

export async function logoutAuthSession(refreshToken?: string | null) {
  await fetch(`${API_BASE}/auth/logout`, withAuthRequestInit(null, {
    method: "POST",
    body: usesCookieAuth()
      ? undefined
      : JSON.stringify({ refresh_token: refreshToken ?? undefined }),
  })).catch(() => undefined);
  setWebAccessToken(null);
  if (!resolveInitialDemoSlot()) {
    setWebAuthMode("cookie");
  }
}
