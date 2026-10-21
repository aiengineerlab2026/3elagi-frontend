import { Platform } from "react-native";
import type { WebViewAuthSession } from "@/constants/nativeWebViewBridge";

export const SESSION_TRANSFER_PARAM = "_st";

export function encodeSessionTransfer(session: WebViewAuthSession): string {
  const json = JSON.stringify(session);
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeSessionTransfer(raw: string): WebViewAuthSession | null {
  try {
    const json = decodeURIComponent(escape(atob(raw)));
    const data = JSON.parse(json) as WebViewAuthSession;
    if (!data?.accessToken || !data?.profile?.id || !data?.role) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Read `_st` from the current URL, strip it from the address bar, return session.
 * Used during auth rehydration so market subdomain hops keep the user logged in.
 */
export function readAndStripSessionTransferFromUrl(): WebViewAuthSession | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get(SESSION_TRANSFER_PARAM);
    if (!raw) return null;
    const session = decodeSessionTransfer(raw);
    url.searchParams.delete(SESSION_TRANSFER_PARAM);
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    return session;
  } catch {
    return null;
  }
}
