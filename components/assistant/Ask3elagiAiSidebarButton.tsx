import { Bot } from "lucide-react-native";
import { usePathname } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import {
  ASK_3ELAGI_AI_RED,
  ASK_3ELAGI_AI_RED_ACTIVE,
  ASK_3ELAGI_AI_RED_HOVER,
  patientUserIdFromPath,
} from "@/components/assistant/ask3elagiAiTrigger";
import { useAsk3elagiAiWidgetStore } from "@/domains/ai/widget-store";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";

type Props = {
  collapsed?: boolean;
  navFontSize?: number;
};

/** Sidebar footer trigger for Ask 3elagi AI (desktop / tablet web). */
export function Ask3elagiAiSidebarButton({
  collapsed = false,
  navFontSize = 14,
}: Props) {
  const { t, isRTL, locale } = useI18n();
  const pathname = usePathname();
  const openWidget = useAsk3elagiAiWidgetStore((s) => s.openWidget);
  const open = useAsk3elagiAiWidgetStore((s) => s.open);
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const isArabic = locale === "ar";
  const labelSize = navFontSize ?? (isArabic ? 17 : 14);

  if (open) return null;

  return (
    <Pressable
      onPress={() => openWidget(undefined, patientUserIdFromPath(pathname))}
      accessibilityRole="button"
      accessibilityLabel={t.records.ask3elagiAi}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.btn,
        collapsed && styles.btnRail,
        {
          flexDirection: dir,
          backgroundColor: pressed
            ? ASK_3ELAGI_AI_RED_ACTIVE
            : hovered
              ? ASK_3ELAGI_AI_RED_HOVER
              : ASK_3ELAGI_AI_RED,
          opacity: pressed ? 0.96 : hovered ? 0.98 : 1,
        },
        Platform.OS === "web"
          ? ({
              transitionProperty: "background-color, opacity",
              transitionDuration: "120ms",
            } as const)
          : null,
      ]}
    >
      <Bot size={18} color="#fff" />
      {collapsed ? null : (
        <Text
          style={[
            styles.label,
            {
              textAlign,
              writingDirection: isRTL ? "rtl" : "ltr",
              fontSize: labelSize,
            },
          ]}
          numberOfLines={1}
        >
          {t.records.ask3elagiAi}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    minHeight: 44,
    width: "100%",
  },
  btnRail: {
    alignSelf: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    minHeight: 36,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 10,
  },
  label: {
    color: "#fff",
    fontWeight: "800",
    flex: 1,
  },
});
