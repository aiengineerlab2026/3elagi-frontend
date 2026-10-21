import { Platform } from "react-native";
import {
  normalizeMarketCountry,
  type MarketCountryCode,
} from "@/constants/patientCountries";
import { WEB_APP_URL } from "@/constants/webAppUrl";

/** Parse market from a hostname (e.g. egypt.3elagi.net → EG). */
export function marketCountryFromHostname(
  hostname: string,
): MarketCountryCode | null {
  const host = hostname.trim().toLowerCase();
  if (!host) return null;
  if (host.includes("egypt")) return "EG";
  if (host.includes("jordan")) return "JO";
  return null;
}

function marketCountryFromSearchParams(
  search: string,
): MarketCountryCode | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  let country = "";
  try {
    country = new URLSearchParams(raw).get("country")?.trim().toLowerCase() ?? "";
  } catch {
    return null;
  }
  if (!country) return null;
  if (country === "eg" || country === "egypt") return "EG";
  if (country === "jo" || country === "jordan") return "JO";
  return null;
}

/**
 * Resolve EG/JO from a full URL: hostname, ?country=, or literal
 * "egypt" / "jordan" anywhere in the URL string.
 */
export function marketCountryFromUrl(href: string): MarketCountryCode | null {
  const trimmed = href.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  try {
    const u = new URL(trimmed);
    const fromHost = marketCountryFromHostname(u.hostname);
    if (fromHost) return fromHost;
    const fromQuery = marketCountryFromSearchParams(u.search);
    if (fromQuery) return fromQuery;
  } catch {
    // Relative / bare strings — fall through to literal scan.
  }

  const egyptIdx = lower.indexOf("egypt");
  const jordanIdx = lower.indexOf("jordan");
  if (egyptIdx < 0 && jordanIdx < 0) return null;
  if (egyptIdx < 0) return "JO";
  if (jordanIdx < 0) return "EG";
  return egyptIdx <= jordanIdx ? "EG" : "JO";
}

/** Current host: browser location on web, WEB_APP_URL on native shells. */
export function getRuntimeHostname(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location?.hostname ?? "";
  }
  try {
    return new URL(WEB_APP_URL).hostname;
  } catch {
    return "";
  }
}

function getRuntimeHref(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location?.href ?? "";
  }
  return WEB_APP_URL;
}

/**
 * When the domain contains "egypt" or "jordan", lock the doctor market.
 * Returns null on generic domains (use profile country instead).
 */
export function getDomainMarketCountry(): MarketCountryCode | null {
  return marketCountryFromHostname(getRuntimeHostname());
}

/**
 * Doctor signup market from the current URL (hostname, query, or path).
 * Null when the URL does not contain egypt or jordan.
 */
export function getUrlMarketCountry(): MarketCountryCode | null {
  return marketCountryFromUrl(getRuntimeHref());
}

/**
 * Country used when browsing doctors on Home:
 * domain lock → profile country → Egypt default.
 */
export function resolveBrowseMarketCountry(
  profileCountry?: string | null,
): MarketCountryCode {
  return getDomainMarketCountry() ?? normalizeMarketCountry(profileCountry);
}
