import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppBackButton } from "@/components/nav/AppBackButton";
import { PatientVitalSignsPanel } from "@/components/records/PatientVitalSignsPanel";
import { EHR } from "@/constants/ehrDesign";
import { useAuthStore } from "@/domains/auth/store";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { navigateBack } from "@/utils/appNavigation";
import { readRouteParam } from "@/utils/routeParams";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PatientVitalsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const profileId = useAuthStore((s) => s.profile?.id);
  const params = useLocalSearchParams<{
    doctorView?: string | string[];
    patientUserId?: string | string[];
  }>();
  const doctorView = readRouteParam(params.doctorView) === "1";
  const patientUserId = readRouteParam(params.patientUserId) ?? profileId ?? undefined;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            borderBottomColor: EHR.border,
            flexDirection: isRTL ? "row-reverse" : "row",
          },
        ]}
      >
        <AppBackButton
          color={EHR.text.primary}
          hitSlop={12}
          fallback="/(tabs)/records"
          accessibilityLabel={isRTL ? "رجوع" : "Back"}
          onPress={() => navigateBack(router, "/(tabs)/records")}
        />
        <Text style={[styles.title, { color: EHR.text.primary }]} numberOfLines={1}>
          {isRTL ? "العلامات الحيوية" : "Vital signs"}
        </Text>
      </View>
      <PatientVitalSignsPanel patientUserId={patientUserId} doctorView={doctorView} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    backgroundColor: EHR.bg.card,
  },
  title: { fontSize: 18, fontWeight: "800", flex: 1 },
});
