import { Linking, Platform } from "react-native";
import type { MarketCountryCode } from "@/constants/patientCountries";
import { WEB_APP_URL } from "@/constants/webAppUrl";
import type { WebViewAuthSession } from "@/constants/nativeWebViewBridge";
import {
  encodeSessionTransfer,
  readAndStripSessionTransferFromUrl,
  SESSION_TRANSFER_PARAM,
} from "@/domains/auth/sessionTransfer";
import { useAuthStore } from "@/domains/auth/store";

function marketSlug(market: MarketCountryCode): "egypt" | "jordan" {
  return market === "JO" ? "jordan" : "egypt";
}

function envMarketBase(market: MarketCountryCode): string | null {
  const raw =
    market === "JO"
      ? process.env.EXPO_PUBLIC_JORDAN_WEB_URL
      : process.env.EXPO_PUBLIC_EGYPT_WEB_URL;
  const trimmed = raw?.trim();
  return trimmed ? trimmed.replace(/\/$/, "") : null;
}

/** Rewrite host so it targets egypt.* or jordan.* (and drops the other). */
export function hostnameForMarket(
  hostname: string,
  market: MarketCountryCode,
): string {
  const slug = marketSlug(market);
  const other = market === "JO" ? "egypt" : "jordan";
  let host = hostname.trim().toLowerCase();
  if (!host) return host;
  if (host.includes(slug)) return host;
  if (host.includes(other)) return host.replace(new RegExp(other, "gi"), slug);
  return `${slug}.${host}`;
}

function currentOriginParts(): { protocol: string; hostname: string; port: string } {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return {
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port,
    };
  }
  try {
    const u = new URL(WEB_APP_URL);
    return { protocol: u.protocol, hostname: u.hostname, port: u.port };
  } catch {
    return { protocol: "https:", hostname: "", port: "" };
  }
}

/**
 * Absolute URL for a market site (Egypt / Jordan).
 * Prefer EXPO_PUBLIC_EGYPT_WEB_URL / EXPO_PUBLIC_JORDAN_WEB_URL when set.
 */
export function getMarketSiteUrl(
  market: MarketCountryCode,
  path = "/",
): string {
  const envBase = envMarketBase(market);
  if (envBase) {
    const base = envBase.endsWith("/") ? envBase : `${envBase}/`;
    return new URL(path.replace(/^\//, ""), base).toString();
  }

  const { protocol, hostname, port } = currentOriginParts();
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    const origin =
      Platform.OS === "web" && typeof window !== "undefined"
        ? window.location.origin
        : WEB_APP_URL.replace(/\/$/, "");
    const url = new URL(path, origin.endsWith("/") ? origin : `${origin}/`);
    url.searchParams.set("country", market);
    return url.toString();
  }

  const host = hostnameForMarket(hostname, market);
  const portPart = port ? `:${port}` : "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${protocol}//${host}${portPart}${normalizedPath}`;
}

/** True when the current host already serves this market. */
export function isOnMarketHost(market: MarketCountryCode): boolean {
  const { hostname } = currentOriginParts();
  if (!hostname) return false;
  return hostname.toLowerCase().includes(marketSlug(market));
}

function snapshotAuthSession(): WebViewAuthSession | null {
  const s = useAuthStore.getState();
  if (!s.accessToken || !s.profile || !s.role) return null;
  return {
    accessToken: s.accessToken,
    profile: s.profile,
    role: s.role,
    doctorId: s.doctorId,
    specialty: s.specialty,
    specialityId: s.specialityId,
    doctorApprovalStatus: s.doctorApprovalStatus,
    emailVerified: s.emailVerified,
  };
}

/**
 * Open the Egypt/Jordan site. Carries the current session in `_st` so the
 * user stays logged in across market subdomains (localStorage is per-host).
 */
export function navigateToMarketSite(
  market: MarketCountryCode,
  path = "/",
): void {
  const target = new URL(getMarketSiteUrl(market, path));
  const session = snapshotAuthSession();
  if (session) {
    target.searchParams.set(SESSION_TRANSFER_PARAM, encodeSessionTransfer(session));
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.location.assign(target.toString());
    return;
  }

  void Linking.openURL(target.toString());
}

/** @deprecated use readAndStripSessionTransferFromUrl via auth rehydration */
export function consumeSessionTransferFromUrl(): boolean {
  const session = readAndStripSessionTransferFromUrl();
  if (!session) return false;
  useAuthStore.getState().applyWebViewSession(session);
  return true;
}
