import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { WebContentColumn } from "@/components/web/WebContentColumn";
import { WebSidebar } from "@/components/web/WebSidebar";
import { navigateToWelcome } from "@/domains/auth/navigation";
import { isSignedIn } from "@/domains/auth/session";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

interface Props {
  children: React.ReactNode;
  /** Public pages (e.g. the doctor directory) render for guests instead of bouncing to welcome. */
  allowGuests?: boolean;
}

/** Web shell with sidebar — always shown on web, including medical record routes. */
export function WebDesktopShell({ children, allowGuests = false }: Props) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const signedIn = isSignedIn(profile, accessToken);

  useEffect(() => {
    if (!hydrated || signedIn || allowGuests) return;
    navigateToWelcome(router);
  }, [hydrated, signedIn, allowGuests, router]);

  if (!hydrated || (!signedIn && !allowGuests)) return null;

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: colors.background,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
      ]}
    >
      <WebSidebar />
      <WebContentColumn wide style={styles.main}>
        {children}
      </WebContentColumn>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, minHeight: 0 },
  main: { minWidth: 0 },
});
