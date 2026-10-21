import { getWebAccessToken, usesBearerTokenAuth, usesCookieAuth } from "@/domains/auth/http";

/** True when the user has a persisted session that can call the API. */
export function isSignedIn(
  profile: { id: string } | null | undefined,
  accessToken: string | null | undefined,
): boolean {
  if (!profile) return false;
  const token = usesCookieAuth()
    ? getWebAccessToken() || accessToken?.trim()
    : accessToken?.trim() || getWebAccessToken();
  return !!token;
}

/** Token used for Bearer auth and WebSocket handshakes. */
export function resolveAccessToken(stored: string | null | undefined): string | null {
  if (usesBearerTokenAuth()) {
    return stored?.trim() || getWebAccessToken() || null;
  }
  return getWebAccessToken();
}
