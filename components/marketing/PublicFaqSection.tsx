import { ChevronDown } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { surfaceCard, UI } from "@/constants/uiTokens";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";

interface Props {
  compact?: boolean;
}

export function PublicFaqSection({ compact = false }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const items = t.faq.items;

  return (
    <View
      style={[
        styles.wrap,
        surfaceCard(colors.card, colors.border),
        { marginHorizontal: 16, marginBottom: compact ? 8 : 24 },
      ]}
    >
      <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
        {t.faq.title}
      </Text>
      {!compact ? (
        <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign }]}>
          {t.faq.subtitle}
        </Text>
      ) : null}

      <View style={styles.list}>
        {items.map((item) => {
          const open = openKey === item.q;
          return (
            <View
              key={item.q}
              style={[styles.item, { borderColor: colors.border, backgroundColor: colors.muted }]}
            >
              <Pressable
                onPress={() => setOpenKey(open ? null : item.q)}
                style={[styles.questionRow, { flexDirection: dir }]}
              >
                <Text style={[styles.question, { color: colors.foreground, textAlign, flex: 1 }]}>
                  {item.q}
                </Text>
                <ChevronDown
                  size={18}
                  color={colors.mutedForeground}
                  style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
                />
              </Pressable>
              {open ? (
                <Text style={[styles.answer, { color: colors.mutedForeground, textAlign }]}>
                  {item.a}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: UI.space.md,
    gap: UI.space.sm,
  },
  title: {
    ...UI.type.section,
    fontSize: 20,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  list: {
    gap: UI.space.sm,
    marginTop: 4,
  },
  item: {
    borderRadius: UI.radius.inner,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  questionRow: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  question: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  answer: {
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
});
