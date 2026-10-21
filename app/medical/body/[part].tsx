import { Redirect } from "expo-router";
import React from "react";
import { BodyPartRecordsView } from "@/components/records/BodyPartRecordsView";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";

export default function BodyPartRecordsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);

  if (!isSignedIn(profile, accessToken)) {
    return <Redirect href="/welcome" />;
  }

  return <BodyPartRecordsView canAdd />;
}
