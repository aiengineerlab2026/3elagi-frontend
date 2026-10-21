import React from "react";
import DoctorsDirectoryScreen from "./doctors.tsx";
import { PublicLandingNav } from "@/components/marketing/PublicLandingNav";
import { WebDesktopShell } from "@/components/web/WebDesktopShell";
import { isSignedIn } from "@/domains/auth/session";
import { useAuthStore } from "@/domains/auth/store";
import { useWebLayout } from "@/hooks/useWebLayout";

/** Same sidebar shell as the tabs, so the directory keeps the side nav on desktop.
 *  Guests are allowed through — on desktop they get the sidebar, below it the top nav. */
export default function DoctorsDirectoryScreenWeb() {
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const signedIn = isSignedIn(profile, accessToken);
  const { isMobile } = useWebLayout();

  return (
    <WebDesktopShell allowGuests>
      {!signedIn && isMobile ? <PublicLandingNav /> : null}
      <DoctorsDirectoryScreen />
    </WebDesktopShell>
  );
}
