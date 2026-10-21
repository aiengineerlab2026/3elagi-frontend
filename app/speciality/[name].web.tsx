import React from "react";
import SpecialityDoctorsScreen from "./[name].tsx";
import { PublicLandingNav } from "@/components/marketing/PublicLandingNav";
import { WebDesktopShell } from "@/components/web/WebDesktopShell";
import { isSignedIn } from "@/domains/auth/session";
import { useAuthStore } from "@/domains/auth/store";
import { useWebLayout } from "@/hooks/useWebLayout";

/** Same shell as the doctor directory, so the roster keeps the side nav. */
export default function SpecialityDoctorsScreenWeb() {
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const signedIn = isSignedIn(profile, accessToken);
  const { isMobile } = useWebLayout();

  return (
    <WebDesktopShell allowGuests>
      {!signedIn && isMobile ? <PublicLandingNav /> : null}
      <SpecialityDoctorsScreen />
    </WebDesktopShell>
  );
}
