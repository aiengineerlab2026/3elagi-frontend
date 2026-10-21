const STORAGE_KEY = "3elagi-cookie-consent-v1";

/** `accepted` = essential + analytics; `rejected` = essential only (analytics off). */
export type CookieConsentChoice = "accepted" | "rejected";

export function readCookieConsent(): CookieConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "accepted" || raw === "rejected" ? raw : null;
  } catch {
    return null;
  }
}

export function saveCookieConsent(choice: CookieConsentChoice): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // ignore quota / private mode
  }
}

export function hasCookieConsentAnswer(): boolean {
  return readCookieConsent() != null;
}

export function hasEssentialConsent(): boolean {
  return hasCookieConsentAnswer();
}

export function hasAnalyticsConsent(): boolean {
  return readCookieConsent() === "accepted";
}
