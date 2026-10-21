import { Redirect } from "expo-router";
import React from "react";
import { IntakeExamsScreen } from "@/components/intake/IntakeExamsScreen";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";

export default function DoctorIntakeExamsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);

  if (!isSignedIn(profile, accessToken) || role?.toLowerCase() !== "doctor") {
    return <Redirect href="/welcome" />;
  }

  return <IntakeExamsScreen showBack />;
}
