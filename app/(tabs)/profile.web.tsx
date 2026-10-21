import { Redirect } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { ProfileEditorWebView } from "@/components/profile/ProfileEditorWebView";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";

export default function ProfileTabWeb() {
  const colors = useColors();
  const { isRTL } = useI18n();
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);

  if (!isSignedIn(profile, accessToken)) {
    return <Redirect href="/welcome" />;
  }

  return (
    <View style={styles.root}>
      <ProfileEditorWebView
        accessToken={accessToken!}
        role={role ?? "patient"}
        isRTL={isRTL}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, width: "100%" },
});
