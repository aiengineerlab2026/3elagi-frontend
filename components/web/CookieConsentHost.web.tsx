import React from "react";
import { CookieConsentBanner } from "@/components/web/CookieConsentBanner.web";

/** Web-only GDPR cookie usage confirmation. */
export function CookieConsentHost() {
  return <CookieConsentBanner />;
}
