import { Bone, LayoutList } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { EHR } from "@/constants/ehrDesign";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { TourAnchor } from "@/components/onboarding/TourAnchor";
import { chatFlexRow } from "@/utils/rtl";

export type RecordsViewMode = "table" | "skeleton";

interface Props {
  mode: RecordsViewMode;
  onChange: (mode: RecordsViewMode) => void;
  variant?: "chip" | "segmented";
}

export function RecordsViewModeToggle({ mode, onChange, variant = "chip" }: Props) {
  const colors = useColors();
  const { t } = useI18n();
  const dir = chatFlexRow();

  const options = [
    { key: "table" as const, label: t.records.tableView, Icon: LayoutList },
    { key: "skeleton" as const, label: t.records.skeletonView, Icon: Bone },
  ] as const;

  const shellStyle =
    variant === "segmented"
      ? [styles.segmentedRow, { flexDirection: dir, borderColor: EHR.border, backgroundColor: EHR.bg.app }]
      : [styles.row, { flexDirection: dir, borderColor: colors.border, backgroundColor: colors.muted }];

  return (
    <View style={shellStyle}>
      {options.map(({ key, label, Icon }) => {
        const active = mode === key;
        const chip = (
          <View style={[styles.optionInner, { flexDirection: dir }]}>
            <Icon size={15} color={active ? EHR.brandDark : EHR.text.secondary} />
            <Text
              style={{
                color: active ? EHR.brandDark : EHR.text.secondary,
                fontWeight: active ? "700" : "600",
                fontSize: 13,
              }}
            >
              {label}
            </Text>
          </View>
        );

        const chipStyle = [
          variant === "segmented" ? styles.segmentedChip : styles.chip,
          {
            backgroundColor: active
              ? variant === "segmented"
                ? EHR.bg.card
                : colors.card
              : "transparent",
            borderColor: active ? EHR.border : "transparent",
          },
        ];

        if (key === "skeleton") {
          return (
            <TourAnchor
              key={key}
              id="records-skeleton-toggle"
              testID="records-skeleton-toggle"
              pressable
              onPress={() => onChange(key)}
              style={chipStyle}
            >
              {chip}
            </TourAnchor>
          );
        }

        return (
          <Pressable
            key={key}
            testID="records-table-toggle"
            onPress={() => onChange(key)}
            style={chipStyle}
          >
            {chip}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: "flex-start",
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
  },
  chip: {
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  segmentedRow: {
    gap: 4,
    borderWidth: 1,
    borderRadius: EHR.radius.control,
    padding: 4,
  },
  segmentedChip: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionInner: {
    alignItems: "center",
    gap: 6,
  },
});
