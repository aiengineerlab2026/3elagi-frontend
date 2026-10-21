/**
 * Client-side country lookup, used only to highlight the visitor's row on the
 * pricing page.
 *
 * The server resolves country for *charging*; this is a display fallback for
 * when it answers `detected_country: null` — which happens on hosts that pass
 * no geo header (Cloudflare/Vercel do, plain Cloud Run does not). Running it
 * here is also more direct: the request carries the user's own IP, with no
 * proxy hops to unpick.
 *
 * HTTPS + CORS only, so it works from the browser without mixed-content errors.
 */
// Ordered by how generous the free tier is — ipapi.co rate-limits quickly and
// then answers with an error body, which parses to null and falls through.
const PROVIDERS = [
  "https://ipwho.is/?fields=country_code",
  "https://api.country.is/",
  "https://ipapi.co/country/",
];
const TIMEOUT_MS = 2500;

let cached: string | null | undefined;

function parseCode(body: string): string | null {
  let value: unknown = body.trim();
  if (String(value).startsWith("{")) {
    try {
      const json = JSON.parse(String(value)) as Record<string, unknown>;
      value = json.country_code ?? json.countryCode ?? json.country;
    } catch {
      return null;
    }
  }
  const code = String(value ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== "XX" ? code : null;
}

/** Two-letter country code, or null when no provider answers. Cached per session. */
export async function detectCountryFromIp(): Promise<string | null> {
  if (cached !== undefined) return cached;

  for (const url of PROVIDERS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) continue;
        const code = parseCode(await res.text());
        if (code) {
          cached = code;
          return code;
        }
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // Try the next provider; a failed lookup just means no highlight.
    }
  }

  cached = null;
  return null;
}
