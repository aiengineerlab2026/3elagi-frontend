import type { PublicDoctorClinic } from "@/domains/doctor/api";

export type DoctorLocationInfo = {
  clinicName: string;
  address: string;
  mapQuery: string;
  mapSearchQuery: string;
  openUrl: string;
};

export type ParsedGoogleMapsInput = {
  isMapsLink: boolean;
  placeName?: string;
  latitude?: number;
  longitude?: number;
  openUrl: string;
  embedQuery: string;
  displayText: string;
};

export function isGoogleMapsUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (host === "maps.app.goo.gl" || host === "goo.gl") return true;
    if (!host.includes("google.")) return false;
    return url.pathname.includes("/maps") || url.pathname.startsWith("/maps");
  } catch {
    return false;
  }
}

/** Parse a Google Maps share link or plain address for map embed + display. */
export function parseGoogleMapsInput(input: string): ParsedGoogleMapsInput {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      isMapsLink: false,
      openUrl: "",
      embedQuery: "",
      displayText: "",
    };
  }

  if (!isGoogleMapsUrl(trimmed)) {
    return {
      isMapsLink: false,
      openUrl: googleMapsOpenUrl(trimmed),
      embedQuery: trimmed,
      displayText: trimmed,
    };
  }

  const placeMatch = trimmed.match(/\/place\/([^/@?]+)/);
  const placeName = placeMatch
    ? decodeURIComponent(placeMatch[1].replace(/\+/g, " ")).trim()
    : undefined;

  const preciseMatch = trimmed.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (preciseMatch) {
    const latitude = parseFloat(preciseMatch[1]);
    const longitude = parseFloat(preciseMatch[2]);
    const embedQuery = `${latitude},${longitude}`;
    return {
      isMapsLink: true,
      placeName,
      latitude,
      longitude,
      openUrl: trimmed,
      embedQuery,
      displayText: placeName || embedQuery,
    };
  }

  const atMatch = trimmed.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const latitude = parseFloat(atMatch[1]);
    const longitude = parseFloat(atMatch[2]);
    const embedQuery = `${latitude},${longitude}`;
    return {
      isMapsLink: true,
      placeName,
      latitude,
      longitude,
      openUrl: trimmed,
      embedQuery,
      displayText: placeName || embedQuery,
    };
  }

  try {
    const url = new URL(trimmed);
    const q = url.searchParams.get("q")?.trim();
    if (q) {
      return {
        isMapsLink: true,
        placeName: q,
        openUrl: trimmed,
        embedQuery: q,
        displayText: q,
      };
    }
  } catch {
    // fall through
  }

  const query = placeName || trimmed;
  return {
    isMapsLink: true,
    placeName,
    openUrl: trimmed,
    embedQuery: query,
    displayText: placeName || trimmed,
  };
}

export function resolveDoctorLocation(
  clinic: PublicDoctorClinic | null | undefined,
  profileLocation?: string | null,
): DoctorLocationInfo | null {
  const clinicName = clinic?.name?.trim() ?? "";
  const clinicAddress = clinic?.location?.trim() ?? "";
  const profileAddress = profileLocation?.trim() ?? "";

  const rawAddress = clinicAddress || profileAddress;
  if (!clinicName && !rawAddress) return null;

  const parsed = rawAddress ? parseGoogleMapsInput(rawAddress) : null;
  const address = parsed?.displayText || rawAddress;
  const mapQuery = parsed?.embedQuery || address || clinicName;
  const mapSearchQuery =
    parsed?.placeName && parsed.latitude != null && parsed.longitude != null
      ? `${parsed.placeName}, ${parsed.latitude},${parsed.longitude}`
      : [clinicName, address].filter(Boolean).join(", ");
  const openUrl = parsed?.openUrl || googleMapsOpenUrl(mapSearchQuery || mapQuery);

  return { clinicName, address, mapQuery, mapSearchQuery, openUrl };
}

export function googleMapsEmbedUrl(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
}

/** HTML document for native WebView — Embed API requires an iframe, not a top-level navigation. */
export function googleMapsEmbedHtml(query: string): string {
  const src = googleMapsEmbedUrl(query).replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #e8edf5; }
  iframe { border: 0; width: 100%; height: 100%; display: block; }
</style>
</head>
<body>
<iframe src="${src}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen title="Clinic location map"></iframe>
</body>
</html>`;
}

export function googleMapsOpenUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function formatReviewDate(iso: string, locale: string): string {
  if (!iso?.trim()) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const tag = locale === "ar" ? "ar-EG" : locale === "de" ? "de-DE" : locale === "es" ? "es-ES" : "en-US";
  return date.toLocaleDateString(tag, { year: "numeric", month: "short", day: "numeric" });
}
