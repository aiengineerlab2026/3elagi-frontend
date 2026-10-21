import { Redirect } from "expo-router";
import React from "react";
import { BodyPartRecordsView } from "@/components/records/BodyPartRecordsView";
import { WebDesktopShell } from "@/components/web/WebDesktopShell";
import { WebMobileTabShell } from "@/components/web/WebMobileTabShell";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import { useWebLayout } from "@/hooks/useWebLayout";

export default function BodyPartRecordsScreenWeb() {
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { isDesktop } = useWebLayout();

  if (!isSignedIn(profile, accessToken)) {
    return <Redirect href="/welcome" />;
  }

  const content = <BodyPartRecordsView canAdd />;

  if (isDesktop) {
    return <WebDesktopShell>{content}</WebDesktopShell>;
  }

  return <WebMobileTabShell>{content}</WebMobileTabShell>;
}
