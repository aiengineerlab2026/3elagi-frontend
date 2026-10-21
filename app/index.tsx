import { Redirect } from "expo-router";
import React from "react";
import { useAuthStore } from "@/domains/auth/store";

/** Guests and signed-in users both land on browseable home. */
export default function Index() {
  const hydrated = useAuthStore((s) => s.hydrated);

  if (!hydrated) return null;

  return <Redirect href="/(tabs)" />;
}
