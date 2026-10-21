const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const STATE_KEY = "3elagi-google-oauth-state";

/** Public — safe in the browser. The secret lives only on the API. */
export const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ??
  "773972750372-8hamr2cer3juf6qbh53q8aivmc8v0om9.apps.googleusercontent.com";

/** Must match an Authorized redirect URI in Google Cloud, origin included. */
export function googleRedirectUri(): string {
  return `${window.location.origin}/auth/callback`;
}

function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Sends the browser to Google's consent screen. `state` is stored first and
 * checked on the way back, so a callback we did not start is rejected (CSRF).
 */
export function startGoogleSignIn(
  options: {
    returnTo?: string;
    medicalRecordsConsent?: boolean;
    /** Signup role, so the form comes back on the tab the user picked. */
    signupRole?: string;
  } = {},
): void {
  const state = randomState();
  sessionStorage.setItem(STATE_KEY, state);
  if (options.returnTo) {
    sessionStorage.setItem(`${STATE_KEY}:return`, options.returnTo);
  }
  // The authorization code can only be redeemed once, so consent is captured
  // before the redirect and replayed with the exchange rather than retried.
  if (options.signupRole) {
    sessionStorage.setItem(`${STATE_KEY}:role`, options.signupRole);
  } else {
    sessionStorage.removeItem(`${STATE_KEY}:role`);
  }
  if (options.medicalRecordsConsent) {
    sessionStorage.setItem(`${STATE_KEY}:consent`, "1");
  } else {
    sessionStorage.removeItem(`${STATE_KEY}:consent`);
  }

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", googleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  // Ask for a fresh account choice rather than silently reusing a session.
  url.searchParams.set("prompt", "select_account");
  window.location.assign(url.toString());
}

/** Consumes the stored state; returns false when it does not match. */
export function consumeGoogleState(state: string | null): boolean {
  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  return !!expected && !!state && expected === state;
}

export function consumeGoogleConsent(): boolean {
  const value = sessionStorage.getItem(`${STATE_KEY}:consent`);
  sessionStorage.removeItem(`${STATE_KEY}:consent`);
  return value === "1";
}

export function consumeGoogleSignupRole(): string | null {
  const value = sessionStorage.getItem(`${STATE_KEY}:role`);
  sessionStorage.removeItem(`${STATE_KEY}:role`);
  return value;
}

export function consumeGoogleReturnTo(): string | null {
  const value = sessionStorage.getItem(`${STATE_KEY}:return`);
  sessionStorage.removeItem(`${STATE_KEY}:return`);
  return value;
}
