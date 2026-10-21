import { ChevronRight } from "lucide-react-native";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppBackButton } from "@/components/nav/AppBackButton";
import {
  DoctorClinicalActionBar,
  type ClinicalActionKey,
} from "@/components/records/DoctorClinicalActionBar";
import {
  RecordsViewModeToggle,
  type RecordsViewMode,
} from "@/components/records/RecordsViewModeToggle";
import { EHR } from "@/constants/ehrDesign";
import { useI18n } from "@/hooks/useI18n";
import { flexRow } from "@/utils/rtl";

type Props = {
  patientName: string;
  viewMode: RecordsViewMode;
  onViewModeChange: (mode: RecordsViewMode) => void;
  consultationOpen: boolean;
  onClinicalAction: (key: ClinicalActionKey) => void;
  onBack: () => void;
  paddingTop: number;
};

export function DoctorPatientRecordsHeader({
  patientName,
  viewMode,
  onViewModeChange,
  consultationOpen,
  onClinicalAction,
  onBack,
  paddingTop,
}: Props) {
  const { isRTL } = useI18n();
  const dir = flexRow(isRTL);

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.shell,
          {
            paddingTop,
            borderBottomColor: EHR.border,
            flexDirection: dir,
          },
        ]}
      >
      <View style={[styles.left, { flexDirection: dir }]}>
        <AppBackButton
          color={EHR.text.primary}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityLabel={isRTL ? "رجوع" : "Back"}
          onPress={onBack}
        />
        <View style={styles.breadcrumb}>
          <Text style={styles.crumbMuted} numberOfLines={1}>
            {isRTL ? "المرضى" : "Patients"}
          </Text>
          <ChevronRight size={14} color={EHR.text.secondary} />
          <Text style={styles.crumbStrong} numberOfLines={1}>
            {patientName}
          </Text>
          <ChevronRight size={14} color={EHR.text.secondary} />
          <Text style={styles.crumbActive} numberOfLines={1}>
            {isRTL ? "السجل الطبي" : "Medical Records"}
          </Text>
        </View>
      </View>

      <View style={styles.center}>
        <RecordsViewModeToggle mode={viewMode} onChange={onViewModeChange} variant="segmented" />
      </View>

      <DoctorClinicalActionBar
        disabled={!consultationOpen}
        onAction={onClinicalAction}
      />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: EHR.workspaceGap,
  },
  shell: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: EHR.headerPadding.vertical,
    paddingHorizontal: EHR.headerPadding.horizontal,
    borderBottomWidth: 1,
    backgroundColor: EHR.bg.card,
    flexWrap: "wrap",
    ...Platform.select({
      web: { flexWrap: "nowrap" } as object,
      default: {},
    }),
  },
  left: {
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  backBtn: { padding: 4 },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    minWidth: 0,
    flexWrap: "wrap",
  },
  crumbMuted: { fontSize: 13, fontWeight: "500", color: EHR.text.secondary },
  crumbStrong: { fontSize: 13, fontWeight: "600", color: EHR.text.primary, maxWidth: 140 },
  crumbActive: { fontSize: 13, fontWeight: "700", color: EHR.brandDark },
  center: {
    flexShrink: 0,
    alignItems: "center",
  },
});
