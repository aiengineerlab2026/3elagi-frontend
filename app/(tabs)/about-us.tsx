import { MessageSquare, ShieldCheck, Stethoscope, Video } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { alignText, flexRow } from "@/utils/rtl";

export default function AboutUsScreen() {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const textAlign = alignText(isRTL);
  const dir = flexRow(isRTL);

  const points = [
    { Icon: Stethoscope, text: t.about.pointDoctors },
    { Icon: MessageSquare, text: t.about.pointChat },
    { Icon: Video, text: t.about.pointCalls },
    { Icon: ShieldCheck, text: t.about.pointRecords },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.headline, { color: colors.foreground, textAlign }]}>
          {t.about.headline}
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground, textAlign }]}>
          {t.about.intro}
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {points.map(({ Icon, text }) => (
            <View key={text} style={[styles.pointRow, { flexDirection: dir }]}>
              <View
                style={[styles.iconWrap, { backgroundColor: `${colors.primary}14` }]}
              >
                <Icon size={18} color={colors.primary} />
              </View>
              <Text style={[styles.pointText, { color: colors.foreground, textAlign }]}>
                {text}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.body, { color: colors.mutedForeground, textAlign }]}>
          {t.about.closing}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },
  headline: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 6,
  },
  body: { fontSize: 15, lineHeight: 23 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  pointRow: { alignItems: "center", gap: 12 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pointText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "600" },
});
