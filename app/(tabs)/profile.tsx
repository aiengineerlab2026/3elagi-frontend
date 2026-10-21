import { Redirect } from "expo-router";
import React from "react";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

export default function ProfileTab() {
  const colors = useColors();
  const { isRTL } = useI18n();
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);

  if (!isSignedIn(profile, accessToken)) {
    return <Redirect href="/welcome" />;
  }

  return (
    <ProfileEditor
      accessToken={accessToken!}
      role={role ?? "patient"}
      isRTL={isRTL}
      colors={colors}
    />
  );
}
