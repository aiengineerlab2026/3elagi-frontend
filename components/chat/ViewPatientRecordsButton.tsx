import { FileText } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { TourAnchor } from "@/components/onboarding/TourAnchor";
import { EHR } from "@/constants/ehrDesign";
import { useI18n } from "@/hooks/useI18n";
import { chatFlexRow } from "@/utils/rtl";

type Props = {
  onPress: () => void;
};

export function ViewPatientRecordsButton({ onPress }: Props) {
  const { t } = useI18n();
  const rowDir = chatFlexRow();

  return (
    <TourAnchor
      id="chat-view-records"
      testID="chat-view-records"
      pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t.tabs.records}
      hitSlop={8}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.btn,
        {
          backgroundColor: pressed || hovered ? EHR.brandSoftHover : EHR.brandSoft,
        },
      ]}
    >
      <View style={[styles.inner, { flexDirection: rowDir }]}>
        <FileText size={16} color={EHR.brandDark} strokeWidth={2.25} />
        <Text style={styles.label} numberOfLines={1}>
          {t.tabs.records}
        </Text>
      </View>
    </TourAnchor>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexShrink: 0,
    borderRadius: EHR.radius.control,
    overflow: "hidden",
    ...Platform.select({
      web: { transition: "background-color 150ms ease" } as object,
      default: {},
    }),
  },
  inner: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 0,
    color: EHR.brandDark,
  },
});
