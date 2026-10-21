import React from "react";

/** Native apps do not use browser cookies — no GDPR banner. */
export function CookieConsentHost() {
  return null;
}
