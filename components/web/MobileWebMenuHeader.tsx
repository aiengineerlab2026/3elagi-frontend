import React from "react";
import { Platform } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { useWebLayout } from "@/hooks/useWebLayout";

/** Menu + brand row for mobile web pages that scroll without the tab AppHeader. */
export function MobileWebMenuHeader() {
  const { isMobile } = useWebLayout();
  if (Platform.OS !== "web" || !isMobile) return null;
  return <AppHeader borderless />;
}
