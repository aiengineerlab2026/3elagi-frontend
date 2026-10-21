import { Redirect } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { MedicalHistoryList } from "@/components/MedicalHistoryList";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import { useColors } from "@/hooks/useColors";
import { useRecordsPage } from "@/hooks/useRecordsPage";

/** Native / mobile-web records — includes body diagram (skeleton) mode. */
export default function RecordsTab() {
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { records } = useRecordsPage();

  if (!isSignedIn(profile, accessToken)) {
    return <Redirect href="/welcome" />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />
      <MedicalHistoryList
        records={records}
        patientUserId={profile!.id}
        canAdd
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
