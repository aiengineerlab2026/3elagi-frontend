import { useEffect } from "react";
import { API_BASE } from "@/constants/api";
import { useAuthStore } from "@/domains/auth/store";
import { applyLocaleAfterAuth, type Locale } from "@/domains/i18n/store";

function readPreferredLocale(value: unknown): Locale | null {
  return value === "ar" ||
    value === "en" ||
    value === "de" ||
    value === "es"
    ? value
    : null;
}

/** Restores saved locale from the user profile when a session is rehydrated. */
export function LocaleAuthSync() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!hydrated || !accessToken) return;

    let cancelled = false;

    void fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        if (cancelled || !user) return;
        applyLocaleAfterAuth(readPreferredLocale(user.preferred_locale));
      })
      .catch(() => {
        if (!cancelled) applyLocaleAfterAuth(null);
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, accessToken]);

  return null;
}
