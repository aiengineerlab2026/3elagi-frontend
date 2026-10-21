import { Redirect } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { ConsultationKindTabs } from "@/components/consultations/ConsultationKindTabs";
import { ConsultationsSection } from "@/components/consultations/ConsultationsSection";
import { PatientConsultationsSection } from "@/components/consultations/PatientConsultationsSection";
import { VideoConsultationsSection } from "@/components/consultations/VideoConsultationsSection";
import { useAuthStore } from "@/domains/auth/store";
import { isSignedIn } from "@/domains/auth/session";
import { useColors } from "@/hooks/useColors";

export default function ConsultationsTab() {
  const colors = useColors();
  const profile = useAuthStore((s) => s.profile);
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const isDoctor = role?.toLowerCase() === "doctor";
  const [kind, setKind] = useState<"text" | "video">("text");

  if (!isSignedIn(profile, accessToken)) {
    return <Redirect href="/welcome" />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />
      <ConsultationKindTabs kind={kind} onChange={setKind} />
      <View style={styles.body}>
        {kind === "text" ? (
          isDoctor ? (
            <ConsultationsSection />
          ) : (
            <PatientConsultationsSection />
          )
        ) : (
          <VideoConsultationsSection isDoctor={isDoctor} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, minHeight: 0 },
});
