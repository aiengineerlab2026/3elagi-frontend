import { MessageCircle } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { UI, primaryButton } from "@/constants/uiTokens";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { flexRow } from "@/utils/rtl";

type Props = {
  signedIn: boolean;
  onPress: () => void;
};

/** Shared start-consultation pill used in profile header (matches list card CTA). */
export function DoctorProfileConsultCta({ signedIn, onPress }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isMobile } = useWebLayout();
  const dir = flexRow(isRTL);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        signedIn ? t.home.startConsultation : "Sign in to start consultation"
      }
      style={({ pressed }) => [
        primaryButton(),
        styles.cta,
        isMobile && styles.ctaMobile,
        {
          backgroundColor: colors.primary,
          opacity: pressed ? 0.92 : 1,
          flexDirection: dir,
        },
      ]}
    >
      <MessageCircle size={isMobile ? 16 : 14} color="#fff" />
      <Text style={[styles.ctaText, isMobile && styles.ctaTextMobile]} numberOfLines={2}>
        {signedIn
          ? t.home.startConsultation
          : isRTL
            ? "سجّل الدخول"
            : "Sign in to start"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cta: {
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 38,
    alignSelf: "stretch",
    ...UI.pressable,
  },
  ctaMobile: {
    minHeight: 44,
    paddingVertical: 11,
    justifyContent: "center",
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
    flexShrink: 1,
  },
  ctaTextMobile: {
    fontSize: 13,
  },
});
