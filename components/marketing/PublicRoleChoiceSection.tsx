import { DOCTOR_APPLY_ROUTE } from "@/constants/doctorSignup";
import { router } from "expo-router";
import { Stethoscope, UserRound } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { primaryButton, secondaryButton, surfaceCard, UI } from "@/constants/uiTokens";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/hooks/useI18n";
import { useWebLayout } from "@/hooks/useWebLayout";
import { alignText, flexRow } from "@/utils/rtl";

interface Props {
  /** Optional override; by default "Find a doctor" goes straight to the directory. */
  onPatientContinue?: () => void;
}

export function PublicRoleChoiceSection({ onPatientContinue }: Props) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const { isDesktop } = useWebLayout();
  const dir = flexRow(isRTL);
  const textAlign = alignText(isRTL);

  const cards = [
    {
      key: "patient",
      title: t.landing.rolePatientTitle,
      body: t.landing.rolePatientBody,
      cta: t.landing.rolePatientCta,
      icon: UserRound,
      primary: true,
      onPress: onPatientContinue ?? (() => router.push("/doctors")),
    },
    {
      key: "doctor",
      title: t.landing.roleDoctorTitle,
      body: t.landing.roleDoctorBody,
      cta: t.landing.roleDoctorCta,
      icon: Stethoscope,
      primary: false,
      onPress: () => router.push(DOCTOR_APPLY_ROUTE),
    },
  ];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: colors.foreground, textAlign }]}>
        {t.landing.roleChoiceTitle}
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign }]}>
        {t.landing.roleChoiceSubtitle}
      </Text>
      <View style={[styles.grid, isDesktop ? { flexDirection: dir } : styles.gridStack]}>
        {cards.map((card) => (
          <View
            key={card.key}
            style={[
              styles.card,
              surfaceCard(colors.card, colors.border),
              isDesktop && styles.cardDesktop,
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: card.primary ? `${colors.primary}18` : colors.muted },
              ]}
            >
              <card.icon size={24} color={colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.foreground, textAlign }]}>
              {card.title}
            </Text>
            <Text style={[styles.cardBody, { color: colors.mutedForeground, textAlign }]}>
              {card.body}
            </Text>
            <Pressable
              onPress={card.onPress}
              style={({ pressed }) => [
                card.primary ? primaryButton() : secondaryButton(colors.border, colors.muted),
                styles.cardCta,
                card.primary
                  ? { backgroundColor: colors.primary, opacity: pressed ? 0.92 : 1 }
                  : { opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Text
                style={[
                  styles.cardCtaText,
                  { color: card.primary ? colors.primaryForeground : colors.primary },
                ]}
              >
                {card.cta}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 10,
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
  grid: {
    gap: UI.space.md,
  },
  gridStack: {
    flexDirection: "column",
  },
  card: {
    flex: 1,
    padding: UI.space.md,
    gap: 10,
    minWidth: 0,
  },
  cardDesktop: {
    minWidth: 280,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  cardCta: {
    marginTop: 4,
    alignSelf: "stretch",
  },
  cardCtaText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
