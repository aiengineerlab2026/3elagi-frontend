import { Bot, BotOff } from "lucide-react-native";
import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { InfoTooltip } from "@/components/InfoTooltip";
import { useAuthStore } from "@/domains/auth/store";
import { useAiPreferenceStore } from "@/domains/ai/aiPreference";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";

/** Turns every AI feature on or off for this device. */
export function ProfileAiField() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const role = useAuthStore((s) => s.role);
  const isDoctor = role?.toLowerCase() === "doctor";
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const enabled = useAiPreferenceStore((s) => s.aiEnabled);
  const setEnabled = useAiPreferenceStore((s) => s.setAiEnabled);
  const hint = isDoctor
    ? t.settings.aiAssistanceHintDoctor
    : t.settings.aiAssistanceHintPatient;
  const tooltip = isDoctor
    ? t.settings.aiAssistanceTooltipDoctor
    : t.settings.aiAssistanceTooltipPatient;

  return (
    <View
      style={[
        styles.row,
        {
          flexDirection: dir,
          backgroundColor: colors.muted,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
        {enabled ? (
          <Bot size={18} color={colors.primary} />
        ) : (
          <BotOff size={18} color={colors.mutedForeground} />
        )}
      </View>
      <View style={styles.copy}>
        <View style={[styles.titleRow, { flexDirection: dir }]}>
          <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
            {t.settings.aiAssistance}
          </Text>
          <InfoTooltip text={tooltip} title={t.settings.aiAssistance} />
        </View>
        <Text style={[styles.hint, { color: colors.mutedForeground, textAlign }]}>
          {hint}
        </Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={setEnabled}
        trackColor={{ false: colors.border, true: `${colors.primary}88` }}
        thumbColor={enabled ? colors.primary : "#f4f4f5"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 2 },
  titleRow: {
    alignItems: "center",
    gap: 6,
  },
  title: { fontSize: 14, fontWeight: "700" },
  hint: { fontSize: 12, lineHeight: 16 },
});
