import { Redirect } from "expo-router";
import React from "react";
import { RecordsWebView } from "@/components/records/RecordsWebView";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";

export default function RecordsTabWeb() {
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);

  if (!isSignedIn(profile, accessToken)) {
    return <Redirect href="/welcome" />;
  }

  return <RecordsWebView />;
}
