import { Redirect } from "expo-router";
import React from "react";
import { ReviewsWebView } from "@/components/reviews/ReviewsWebView";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";

export default function ReviewsTabWeb() {
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);

  if (!isSignedIn(profile, accessToken)) {
    return <Redirect href="/welcome" />;
  }

  return <ReviewsWebView />;
}
