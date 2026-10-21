import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { LanguageDropdown } from "@/components/language/LanguageDropdown";
import { LanguageFlagRow } from "@/components/language/LanguageFlagRow";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";

interface Props {
  embedded?: boolean;
  inFooter?: boolean;
  /** Inline flags on mobile profile (native + mobile web). */
  wideCards?: boolean;
}

function useProfileInlineFlags(): boolean {
  const { isMobile } = useWebLayout();
  return Platform.OS !== "web" || isMobile;
}

export function ProfileLanguageField({
  embedded = false,
  inFooter = false,
  wideCards = false,
}: Props) {
  const colors = useColors();
  const { isRTL, t } = useI18n();
  const inlineFlags = useProfileInlineFlags();
  const dir = isRTL ? "row-reverse" : "row";

  const languagePicker = inlineFlags ? (
    <LanguageFlagRow fillWidth={wideCards || embedded} />
  ) : embedded ? (
    <LanguageDropdown showLabel />
  ) : (
    <LanguageDropdown compact />
  );

  if (embedded || inFooter) {
    return (
      <View style={styles.embedded}>
        <Text
          style={[
            styles.embeddedLabel,
            { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {t.settings.language}
        </Text>
        <View
          style={[
            styles.embeddedRow,
            { flexDirection: dir, alignSelf: isRTL ? "flex-end" : "flex-start" },
          ]}
        >
          {languagePicker}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, { flexDirection: dir }, inFooter && styles.footerRow]}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {t.settings.language}
      </Text>
      {languagePicker}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 14,
    gap: 12,
  },
  footerRow: {
    marginTop: 0,
    marginBottom: 0,
  },
  embedded: {
    gap: 10,
  },
  embeddedLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  embeddedRow: {
    width: "100%",
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
});
