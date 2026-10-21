import { useEffect } from "react";
import { hasAnalyticsConsent } from "@/domains/privacy/cookieConsent";
import { loadWebClarity } from "@/domains/privacy/clarityWeb";

/** Web: load Clarity only when the user has accepted the cookie banner. */
export function WebClarityBootstrap() {
  useEffect(() => {
    if (hasAnalyticsConsent()) {
      loadWebClarity();
    }
  }, []);

  return null;
}
