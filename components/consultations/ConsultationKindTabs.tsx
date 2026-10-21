import { MessageCircle, Video } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { UI } from "@/constants/uiTokens";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";

export type ConsultationKind = "text" | "video";

type Props = {
  kind: ConsultationKind;
  onChange: (kind: ConsultationKind) => void;
};

export function ConsultationKindTabs({ kind, onChange }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);

  const options: {
    key: ConsultationKind;
    label: string;
    Icon: typeof MessageCircle;
  }[] = [
    { key: "text", label: t.consultations.textConsultations, Icon: MessageCircle },
    { key: "video", label: t.consultations.videoConsultations, Icon: Video },
  ];

  return (
    <View style={[styles.wrap, { borderBottomColor: colors.border }]}>
      <View style={[styles.row, { flexDirection: dir }]}>
        {options.map(({ key, label, Icon }) => {
          const active = kind === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => onChange(key)}
              style={({ pressed }) => [
                styles.tab,
                {
                  borderBottomColor: active ? colors.primary : "transparent",
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Icon size={16} color={active ? colors.primary : colors.mutedForeground} />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: active ? colors.primary : colors.mutedForeground,
                    textAlign,
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: UI.space.md,
  },
  row: {
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
});
