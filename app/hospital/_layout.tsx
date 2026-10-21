import { Redirect, Slot } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { AppSidebarDrawer } from "@/components/nav/AppSidebarDrawer";
import { WebSidebar } from "@/components/web/WebSidebar";
import { AppSidebarProvider } from "@/contexts/AppSidebarContext";
import { isSignedIn } from "@/domains/auth/session";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";

/**
 * Hospital area uses the same side nav as the main app (items filtered to the
 * hospital role in constants/appNav): permanent sidebar on tablet+ web,
 * menu button + drawer on phones and native.
 */
export default function HospitalLayout() {
  const colors = useColors();
  const { isRTL } = useI18n();
  const { isTablet } = useWebLayout();
  const hydrated = useAuthStore((s) => s.hydrated);
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);

  if (!hydrated) return null;
  if (!isSignedIn(profile, accessToken)) return <Redirect href="/welcome" />;
  if (role?.toLowerCase() !== "hospital") return <Redirect href="/(tabs)" />;

  const permanentSidebar = Platform.OS === "web" && isTablet;

  return (
    <AppSidebarProvider>
      <View
        style={[
          styles.shell,
          { backgroundColor: colors.background, flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        {permanentSidebar ? <WebSidebar /> : null}
        <View style={styles.main}>
          {permanentSidebar ? null : <AppHeader />}
          <Slot />
        </View>
      </View>
      <AppSidebarDrawer />
    </AppSidebarProvider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, minHeight: 0 },
  main: { flex: 1, minWidth: 0, minHeight: 0 },
});
